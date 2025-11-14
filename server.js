import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import pako from 'pako';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// CORS konfigurace - povolit všechny originy (pro Chrome extension)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.use(express.json({ limit: '10mb' }));

// Raw body pro Stripe webhooks
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

// EJS template engine
app.set('view engine', 'ejs');
app.set('views', '.');

// Servírovat statické soubory z pages složky (CSS, obrázky)
app.use('/pages', express.static('pages'));

// Servírovat statické soubory z Gallery složky (CSS, JS)
app.use('/Gallery', express.static('Gallery'));

// Servírovat statické soubory z iframe složky
app.use('/iframe', express.static('iframe'));

// Servírovat statické soubory z root (pro landing page)
app.use(express.static('.', { 
  index: 'index.html', // Automaticky servírovat index.html pro /
  dotfiles: 'ignore'
}));

// Inicializace Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log('🔧 Supabase config check:');
console.log('  - URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('  - Service Key:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
console.log('  - Anon Key:', supabaseAnonKey ? '✅ Set' : '❌ Missing');

// Inicializovat pouze pokud jsou credentials k dispozici
let supabase = null;
let supabaseAdmin = null;
if (supabaseUrl && supabaseAnonKey && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  console.log('✅ Supabase initialized');
} else {
  console.log('⚠️  Supabase not initialized - API routes will not work');
}

// Inicializace Stripe
let stripe = null;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  console.log('✅ Stripe initialized');
} else {
  console.log('⚠️  Stripe not initialized - payment routes will not work');
}

// Pricing konfigurace
const PRICING = {
  free: {
    name: 'Free',
    price: 0,
    icon_limit: 100,
    features: ['100 SVG ikon', 'Základní podpora', 'Komprese ikon']
  },
  pro: {
    name: 'Pro',
    price: 9.99,
    price_id: process.env.STRIPE_PRO_PRICE_ID,
    icon_limit: 1000,
    features: ['1000 SVG ikon', 'Prioritní podpora', 'API přístup', 'Komprese ikon']
  }
};

// ===== HELPER FUNKCE =====

// Komprese SVG pomocí gzip
function compressSvg(svgContent) {
  const compressed = pako.gzip(svgContent);
  return Buffer.from(compressed).toString('base64');
}

// Dekomprese SVG
function decompressSvg(compressedBase64) {
  const buffer = Buffer.from(compressedBase64, 'base64');
  const decompressed = pako.ungzip(buffer, { to: 'string' });
  return decompressed;
}

// Výpočet velikostí
function calculateSizes(svgContent) {
  const originalSize = (new Blob([svgContent]).size / 1024).toFixed(2);
  const compressedContent = compressSvg(svgContent);
  const compressedSize = (compressedContent.length * 0.75 / 1024).toFixed(2);
  return { originalSize, compressedSize, compressedContent };
}

// Middleware pro autentizaci
async function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    console.log('⚠️ Authentication failed: No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    console.log('⚠️ Authentication failed: Invalid token', error?.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  console.log('✅ Authentication successful:', user.email);
  req.user = user;
  next();
}

// Middleware pro admin autentizaci
async function authenticateAdmin(req, res, next) {
  await authenticate(req, res, async () => {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', req.user.id)
      .single();
    
    if (!profile || !profile.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
  });
}

// ===== AUTHENTIZAČNÍ ENDPOINTY =====

// Jednotný OTP-only endpoint - bez aktivace, jen OTP kód pro všechny
app.post('/api/auth/initiate', async (req, res) => {
  try {
    console.log('📥 Auth initiate request');
    
    const { email } = req.body;
    
    // Validace emailu
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return res.status(400).json({ error: 'Email cannot be empty' });
    }
    
    // Základní validace email formátu
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    console.log('✅ Sending OTP to:', trimmedEmail);
    
    // Zkontrolovat jestli uživatel existuje
    let userExists = false;
    try {
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
      const user = usersData?.users?.find(u => u.email?.toLowerCase() === trimmedEmail.toLowerCase());
      
      if (user) {
        userExists = true;
        console.log('✅ User exists:', user.id);
      } else {
        // Nový uživatel - zkontrolovat limit
        const activeUsers = usersData.users.filter(u => u.email_confirmed_at !== null);
        const MAX_USERS = 100;
        
        if (activeUsers.length >= MAX_USERS) {
          return res.status(403).json({ 
            error: 'User registration limit reached',
            code: 'USER_LIMIT_REACHED'
          });
        }
        
        console.log('📝 New user, creating with confirmed email');
        
        // Vytvořit nového uživatele s již potvrzeným emailem pomocí admin API
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: trimmedEmail,
          email_confirm: true,  // Automaticky potvrdit email
          user_metadata: {
            email: trimmedEmail
          }
        });
        
        if (createError) {
          console.error('❌ Error creating user:', createError.message);
          return res.status(400).json({ error: createError.message });
        }
        
        console.log('✅ New user created with confirmed email:', newUser.user.id);
        
        // Vytvořit user profile
        const { error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .insert({
            id: newUser.user.id,
            email: trimmedEmail,
            tier: 'free',
            icon_limit: 100,
            subscription_status: 'active'
          });
        
        if (profileError) {
          console.warn('⚠️ Error creating user profile:', profileError.message);
        } else {
          console.log('✅ User profile created');
        }
      }
    } catch (err) {
      console.error('❌ Error checking/creating user:', err);
      return res.status(500).json({ error: 'Failed to process user' });
    }
    
    // Teď poslat OTP kód (uživatel už má potvrzený email)
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        shouldCreateUser: false,  // Už jsme vytvořili
      }
    });
    
    if (error) {
      console.error('❌ OTP error:', error.message);
      return res.status(400).json({ error: error.message });
    }
    
    console.log('✅ OTP code sent to:', trimmedEmail);
    res.json({ 
      type: 'login',
      message: 'Verification code sent to your email',
      email: trimmedEmail 
    });
  } catch (error) {
    console.error('❌ Error in initiate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend OTP - poslat nový kód (jen pro existující uživatele)
app.post('/api/auth/resend', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const trimmedEmail = email.trim();
    console.log('📧 Resending OTP to:', trimmedEmail);
    
    // Poslat nový OTP kód (shouldCreateUser: false, protože by měl již existovat)
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        shouldCreateUser: false,
      }
    });
    
    if (error) {
      console.error('❌ Resend error:', error.message);
      return res.status(400).json({ error: error.message });
    }
    
    console.log('✅ OTP code resent to:', trimmedEmail);
    res.json({ 
      type: 'login',
      message: 'Verification code sent to your email',
      email: trimmedEmail
    });
  } catch (error) {
    console.error('❌ Error in resend:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Registrace - DEPRECATED, použijte /api/auth/initiate
app.post('/api/auth/register', async (req, res) => {
  // Redirect na initiate endpoint
  req.url = '/api/auth/initiate';
  return app._router.handle(req, res, () => {});
});

// Přihlášení - DEPRECATED, použijte /api/auth/initiate
app.post('/api/auth/login', async (req, res) => {
  // Redirect na initiate endpoint
  req.url = '/api/auth/initiate';
  return app._router.handle(req, res, () => {});
});

// Ověření OTP kódu
app.post('/api/auth/verify', async (req, res) => {
  try {
    const { email, token } = req.body;
    
    if (!email || !token) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }
    
    // Odebrat pomlčky z tokenu (XXX-XXX -> XXXXXX)
    const cleanToken = token.replace(/-/g, '').toUpperCase();
    
    // Ověřit OTP kód
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: cleanToken,
      type: 'email'
    });
    
    if (error) {
      return res.status(401).json({ error: 'Invalid verification code' });
    }
    
    // Zkontrolovat, zda existuje user profile, pokud ne, vytvořit ho
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    if (!profile) {
      await supabase.from('user_profiles').insert({
        id: data.user.id,
        email: data.user.email,
        tier: 'free',
        icon_limit: 100,
        subscription_status: 'active'
      });
    }
    
    console.log(`✅ Uživatel přihlášen: ${email}`);
    res.json({ 
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      email: data.user.email 
    });
  } catch (error) {
    console.error('Chyba při ověření:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh tokenu pomocí refresh_token
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    
    console.log('🔄 Refreshing token...');
    
    // Obnovit session pomocí refresh tokenu
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });
    
    if (error || !data.session) {
      console.error('❌ Refresh error:', error?.message);
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    console.log('✅ Token refreshed successfully');
    res.json({ 
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      email: data.user.email
    });
  } catch (error) {
    console.error('❌ Error in refresh:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend aktivačního linku pro neaktivované účty - DEPRECATED
// Použijte /api/auth/resend místo tohoto
app.post('/api/auth/resend-activation', async (req, res) => {
  // Redirect na nový resend endpoint
  req.url = '/api/auth/resend';
  return app._router.handle(req, res, () => {});
});

// HTML stránka pro aktivaci účtu - DEPRECATED (už nepoužíváme aktivaci)
app.get('/activate', (req, res) => {
  res.send('<h1>Activation no longer required</h1><p>Please use the OTP code from your email to log in.</p>');
});

// Aktivace účtu přes magic link - DEPRECATED (už nepoužíváme aktivaci)
app.get('/api/auth/activate', (req, res) => {
  res.redirect('/activate');
});

// ===== GALERIE ENDPOINTY =====

app.post('/api/gallery', authenticate, async (req, res) => {
  try {
    console.log('🔵 POST /api/gallery - Request received');
    console.log('📧 User:', req.user?.email, 'ID:', req.user?.id);
    
    const { svg, source, name, size } = req.body;
    console.log('📦 Request data:', { 
      svgLength: svg?.length, 
      source, 
      name, 
      size 
    });
    
    if (!svg) {
      console.log('❌ No SVG content provided');
      return res.status(400).json({ error: 'SVG content is required' });
    }
    
    // Zkontrolovat limit
    console.log('🔍 Checking icon count for user...');
    const { count, error: countError } = await supabaseAdmin
      .from('svg_icons')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);
    
    if (countError) {
      console.error('❌ Error counting icons:', countError);
      return res.status(500).json({ error: 'Failed to check icon count' });
    }
    console.log('✅ Current icon count:', count);
    
    console.log('🔍 Checking user profile...');
    console.log('🔍 Query params:', { userId: req.user.id });
    
    let profile, profileError;
    try {
      const result = await supabaseAdmin
        .from('user_profiles')
        .select('icon_limit, tier')
        .eq('id', req.user.id)
        .maybeSingle();
      
      profile = result.data;
      profileError = result.error;
      
      console.log('📊 Profile query completed!');
      console.log('📊 Profile data:', profile);
      console.log('📊 Profile error:', profileError);
      console.log('📊 Has profile?', !!profile);
      console.log('📊 Has error?', !!profileError);
    } catch (queryError) {
      console.error('❌❌❌ EXCEPTION in profile query:', queryError);
      console.error('Exception message:', queryError.message);
      console.error('Exception stack:', queryError.stack);
      return res.status(500).json({ error: 'Profile query failed', details: queryError.message });
    }
    
    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }
    
    // Pokud profil neexistuje, vytvořit ho
    if (!profile) {
      console.log('📝 Creating missing user profile for:', req.user.email);
      const { error: insertError } = await supabaseAdmin.from('user_profiles').insert({
        id: req.user.id,
        email: req.user.email,
        tier: 'free',
        icon_limit: 100,
        subscription_status: 'active'
      });
      
      if (insertError) {
        console.error('❌ Error creating profile:', insertError);
        return res.status(500).json({ error: 'Failed to create user profile' });
      }
      
      // Načíst nově vytvořený profil
      const { data: newProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('icon_limit, tier')
        .eq('id', req.user.id)
        .single();
      
      profile = newProfile;
      console.log('✅ Profile created successfully');
    } else {
      console.log('✅ Profile found:', { tier: profile.tier, limit: profile.icon_limit });
    }
    
    if (count >= profile.icon_limit) {
      return res.status(400).json({ 
        error: 'Icon limit reached',
        current: count,
        limit: profile.icon_limit,
        tier: profile.tier,
        message: profile.tier === 'free' 
          ? 'Upgrade to Pro for 1000 icons!' 
          : 'You have reached your icon limit'
      });
    }
    
    // Extrahovat název
    let iconName = name || 'Bez názvu';
    if (!name && source) {
      try {
        const url = new URL(source);
        iconName = url.pathname.split('/').pop().replace(/\.(svg|png|jpg|jpeg)$/i, '') || 'Bez názvu';
      } catch {
        iconName = 'Bez názvu';
      }
    }
    
    // Komprese a výpočet velikostí
    console.log('🗜️ Compressing SVG...');
    const { originalSize, compressedSize, compressedContent } = calculateSizes(svg);
    console.log('✅ Compression done:', { originalSize, compressedSize });
    
    console.log('💾 Inserting icon into database...');
    const { data, error } = await supabaseAdmin
      .from('svg_icons')
      .insert([
        {
          user_id: req.user.id,
          name: iconName,
          size: originalSize,
          compressed_size: compressedSize,
          source: source || 'unknown',
          svg_content: compressedContent,
          is_compressed: true,
        }
      ])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error inserting icon:', error);
      return res.status(500).json({ error: error.message });
    }
    
    const savingsPercent = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    console.log('✅ SVG přidáno (' + originalSize + 'KB -> ' + compressedSize + 'KB, úspora ' + savingsPercent + '%): ' + req.user.email);
    res.json({ 
      message: 'Added to gallery', 
      item: data,
      compression_ratio: ((1 - compressedSize / originalSize) * 100).toFixed(1) + '%'
    });
  } catch (error) {
    console.error('❌❌❌ FATAL ERROR in POST /api/gallery ❌❌❌');
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    console.error('Error stack:', error.stack);
    console.error('User:', req.user?.email);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/api/gallery', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('svg_icons')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    // Dekomprimovat SVG
    const items = data.map(item => ({
      id: item.id,
      svg: item.is_compressed ? decompressSvg(item.svg_content) : item.svg_content,
      source: item.source,
      timestamp: item.created_at,
      name: item.name,
      size: item.size
    }));
    
    res.json(items);
  } catch (error) {
    console.error('Chyba při načítání galerie:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/gallery/stats', authenticate, async (req, res) => {
  try {
    const { count } = await supabaseAdmin
      .from('svg_icons')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);
    
    let { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('icon_limit, tier, subscription_status')
      .eq('id', req.user.id)
      .maybeSingle();
    
    // Pokud profil neexistuje, vytvořit ho
    if (!profile) {
      console.log('📝 Creating missing user profile for:', req.user.email);
      const { error: insertError } = await supabaseAdmin.from('user_profiles').insert({
        id: req.user.id,
        email: req.user.email,
        tier: 'free',
        icon_limit: 100,
        subscription_status: 'active'
      });
      
      if (insertError) {
        console.error('❌ Error creating profile:', insertError);
        return res.status(500).json({ error: 'Failed to create user profile' });
      }
      
      // Načíst nově vytvořený profil
      const { data: newProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('icon_limit, tier, subscription_status')
        .eq('id', req.user.id)
        .single();
      
      profile = newProfile;
    }
    
    res.json({
      current: count,
      limit: profile.icon_limit,
      remaining: profile.icon_limit - count,
      tier: profile.tier,
      subscription_status: profile.subscription_status,
      can_upgrade: profile.tier === 'free'
    });
  } catch (error) {
    console.error('Chyba při načítání statistik:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/gallery/:id', authenticate, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('svg_icons')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    console.log('✅ SVG smazáno: ' + req.user.email);
    res.json({ message: 'Deleted from gallery' });
  } catch (error) {
    console.error('Chyba při mazání:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== STRIPE BILLING ENDPOINTY =====

app.get('/api/pricing', (req, res) => {
  res.json(PRICING);
});

app.post('/api/create-checkout-session', authenticate, async (req, res) => {
  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id, tier')
      .eq('id', req.user.id)
      .single();
    
    if (profile.tier === 'pro') {
      return res.status(400).json({ error: 'Already subscribed to Pro' });
    }
    
    // Vytvořit nebo použít existujícího Stripe zákazníka
    let customerId = profile.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: {
          supabase_user_id: req.user.id
        }
      });
      customerId = customer.id;
      
      await supabaseAdmin
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', req.user.id);
    }
    
    // Vytvořit Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICING.pro.price_id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/gallery?success=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/gallery?canceled=true`,
      metadata: {
        supabase_user_id: req.user.id
      }
    });
    
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Chyba při vytváření checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cancel-subscription', authenticate, async (req, res) => {
  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_subscription_id')
      .eq('id', req.user.id)
      .single();
    
    if (!profile.stripe_subscription_id) {
      return res.status(400).json({ error: 'No active subscription' });
    }
    
    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: true
    });
    
    res.json({ message: 'Subscription will be canceled at period end' });
  } catch (error) {
    console.error('Chyba při rušení subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stripe Webhook
app.post('/api/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  console.log(`📧 Stripe webhook received: ${event.type}`);
  
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata.supabase_user_id;
        
        await supabaseAdmin
          .from('user_profiles')
          .update({ 
            tier: 'pro',
            icon_limit: 1000,
            stripe_subscription_id: session.subscription,
            subscription_status: 'active'
          })
          .eq('id', userId);
        
        console.log(`✅ User upgraded to Pro: ${userId}`);
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();
        
        if (profile) {
          await supabaseAdmin
            .from('user_profiles')
            .update({ 
              subscription_status: subscription.status,
              subscription_current_period_end: new Date(subscription.current_period_end * 1000)
            })
            .eq('id', profile.id);
          
          console.log(`✅ Subscription updated: ${profile.id}`);
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();
        
        if (profile) {
          await supabaseAdmin
            .from('user_profiles')
            .update({ 
              tier: 'free',
              icon_limit: 100,
              subscription_status: 'canceled',
              stripe_subscription_id: null
            })
            .eq('id', profile.id);
          
          console.log(`⚠️ User downgraded to Free: ${profile.id}`);
        }
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();
        
        if (profile) {
          await supabaseAdmin
            .from('payment_history')
            .insert({
              user_id: profile.id,
              stripe_payment_intent_id: invoice.payment_intent,
              amount: invoice.amount_paid / 100,
              currency: invoice.currency,
              status: 'succeeded'
            });
          
          console.log(`💰 Payment recorded: ${profile.id}`);
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();
        
        if (profile) {
          await supabaseAdmin
            .from('user_profiles')
            .update({ subscription_status: 'past_due' })
            .eq('id', profile.id);
          
          console.log(`⚠️ Payment failed: ${profile.id}`);
        }
        break;
      }
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ===== ADMIN ENDPOINTY =====

app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      return res.status(500).json({ error: authError.message });
    }
    
    const userIds = users.map(u => u.id);
    
    const { data: profiles } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .in('id', userIds);
    
    const userStats = await Promise.all(
      users.map(async (user) => {
        const { count } = await supabaseAdmin
          .from('svg_icons')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        const profile = profiles.find(p => p.id === user.id);
        
        return {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          icon_count: count || 0,
          icon_limit: profile?.icon_limit || 100,
          tier: profile?.tier || 'free',
          subscription_status: profile?.subscription_status,
          is_admin: profile?.is_admin || false
        };
      })
    );
    
    res.json(userStats);
  } catch (error) {
    console.error('Chyba při načítání uživatelů:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/admin/users/:id/limit', authenticateAdmin, async (req, res) => {
  try {
    const { limit } = req.body;
    
    if (!limit || limit < 0) {
      return res.status(400).json({ error: 'Invalid limit' });
    }
    
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({ icon_limit: limit })
      .eq('id', req.params.id);
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Limit updated for user: ${req.params.id}`);
    res.json({ message: 'Limit updated' });
  } catch (error) {
    console.error('Chyba při aktualizaci limitu:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Uživatel smazán adminem: ${req.params.id}`);
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Chyba při mazání uživatele:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const { count: iconCount } = await supabaseAdmin
      .from('svg_icons')
      .select('*', { count: 'exact', head: true });
    
    const { data: profiles } = await supabaseAdmin
      .from('user_profiles')
      .select('tier');
    
    const freeUsers = profiles.filter(p => p.tier === 'free').length;
    const proUsers = profiles.filter(p => p.tier === 'pro').length;
    
    res.json({
      total_users: users.length,
      free_users: freeUsers,
      pro_users: proUsers,
      total_icons: iconCount,
      avg_icons_per_user: (iconCount / users.length).toFixed(1),
      monthly_revenue: proUsers * 9.99
    });
  } catch (error) {
    console.error('Chyba při načítání statistik:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== HTML STRÁNKY =====

// Root page - Landing page (servírováno přes static middleware výše)
// Fallback pokud static middleware selže
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: __dirname || '.' });
});

// Gallery Login page - Přihlašovací formulář
app.get('/gallery/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login - svag</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #ffffff;
          min-height: 100vh;
        }
        .login-container {
          width: 100%;
          min-height: 100vh;
        }
        .login-header {
          padding: 48px;
          border-bottom: 1px solid #f0f0f0;
        }
        .login-logo {
          font-size: 48px;
          font-weight: 700;
          letter-spacing: 0.48px;
          color: #070707;
          margin: 0;
        }
        .login-content {
          padding: 0 48px;
          padding-top: 24px;
          max-width: 420px;
        }
        .auth-step {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .login-input {
          width: 100%;
          padding: 18px 24px;
          border: 2px solid #d4d4d4;
          border-radius: 12px;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          color: #070707;
          transition: border-color 0.2s;
          line-height: 18px;
          letter-spacing: 0.14px;
        }
        .login-input::placeholder {
          color: rgba(0, 0, 0, 0.5);
        }
        .login-input:focus {
          outline: none;
          border-color: #070707;
        }
        .login-btn {
          width: 100%;
          height: 54px;
          padding: 12px;
          background: #000000;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: opacity 0.2s;
          line-height: 18px;
          letter-spacing: 0.16px;
        }
        .login-btn:hover {
          opacity: 0.9;
        }
        .login-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .login-btn-secondary {
          width: 100%;
          height: 54px;
          padding: 12px;
          background: #f0f0f0;
          color: #333;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: background 0.2s;
        }
        .login-btn-secondary:hover {
          background: #e0e0e0;
        }
        .code-instruction {
          padding: 12px 0;
          font-size: 14px;
          font-weight: 400;
          color: #000000;
          text-align: center;
          line-height: 18px;
          letter-spacing: 0.14px;
          margin: 0;
          max-width: 420px;
        }
        .code-inputs-grid {
          display: flex;
          width: 100%;
          align-items: center;
          gap: 8px;
          justify-content: center;
        }
        .code-input {
          height: 54px;
          flex: 1 0 0;
          width: 100%;
          font-size: 18px;
          font-weight: 600;
          border: 2px solid #d4d4d4;
          border-radius: 12px;
          font-family: 'Inter', sans-serif;
          transition: all 0.2s;
          color: #070707;
          text-align: center;
          padding: 0;
        }
        .code-input:focus {
          outline: none;
          border-color: #070707;
        }
        .code-input.filled {
          border-color: #070707;
        }
        .code-input.error {
          border-color: #f5576c;
          background: #fff0f0;
        }
        .resend-link {
          text-align: center;
          display: block;
          color: rgba(0, 0, 0, 0.5);
          text-decoration: none;
          font-size: 14px;
          padding: 12px 0;
          line-height: 18px;
          letter-spacing: 0.14px;
        }
        .resend-link:hover {
          color: #070707;
        }
        .auth-info,
        .auth-hint {
          text-align: center;
          color: #666;
          font-size: 14px;
          line-height: 1.5;
          padding: 12px 0;
        }
        @media (max-width: 600px) {
          .login-header {
            padding: 24px;
          }
          .login-logo {
            font-size: 36px;
          }
          .login-content {
            padding: 0 24px;
            padding-top: 16px;
          }
          .code-inputs-grid {
            gap: 4px;
          }
          .code-input {
            height: 48px;
            font-size: 18px;
          }
        }
      </style>
    </head>
    <body>
      <div id="loginSection" class="login-container">
        <header class="login-header">
          <h1 class="login-logo">svag</h1>
        </header>
        
        <div class="login-content">
          <!-- Email Step -->
          <div id="emailStep" class="auth-step">
            <input 
              type="email" 
              id="emailInput" 
              class="login-input" 
              placeholder="Start with your mail" 
            />
            <button id="sendBtn" class="login-btn" style="display: none;">Continue</button>
          </div>
          
          <!-- Code Step -->
          <div id="codeStep" class="auth-step" style="display: none;">
            <p class="code-instruction">Check your mailbox and enter the code.</p>
            <div class="code-inputs-grid">
              <input type="text" class="code-input" maxlength="1" data-index="0" />
              <input type="text" class="code-input" maxlength="1" data-index="1" />
              <input type="text" class="code-input" maxlength="1" data-index="2" />
              <input type="text" class="code-input" maxlength="1" data-index="3" />
              <input type="text" class="code-input" maxlength="1" data-index="4" />
              <input type="text" class="code-input" maxlength="1" data-index="5" />
              <input type="text" class="code-input" maxlength="1" data-index="6" />
              <input type="text" class="code-input" maxlength="1" data-index="7" />
            </div>
            <a href="#" id="resendEmailLink" class="resend-link">Resend code</a>
            <button id="verifyCodeBtn" class="login-btn" style="display: none;">Verify</button>
          </div>
          
          <!-- Register Success -->
          <div id="registerSuccess" class="auth-step" style="display: none;">
            <p class="auth-info">Activation link sent to <strong id="registerEmail"></strong></p>
            <p class="auth-hint">Please check your email and click the link to activate your account.</p>
            <button id="backToEmailBtn" class="login-btn-secondary">Back</button>
          </div>
        </div>
      </div>
      
      <script>
        let currentEmail = '';
        const emailInput = document.getElementById('emailInput');
        const sendBtn = document.getElementById('sendBtn');
        const emailStep = document.getElementById('emailStep');
        const codeStep = document.getElementById('codeStep');
        const registerSuccess = document.getElementById('registerSuccess');
        const verifyCodeBtn = document.getElementById('verifyCodeBtn');
        const resendEmailLink = document.getElementById('resendEmailLink');
        const backToEmailBtn = document.getElementById('backToEmailBtn');
        const codeDigits = Array.from(document.querySelectorAll('.code-input'));
        const registerEmailEl = document.getElementById('registerEmail');
        
        // Check if already logged in
        const token = localStorage.getItem('token');
        const userEmail = localStorage.getItem('userEmail');
        if (token && userEmail) {
          window.location.href = '/gallery';
        }
        
        // Email input handlers
        emailInput.addEventListener('focus', () => {
          sendBtn.style.display = 'block';
        });
        
        emailInput.addEventListener('input', () => {
          sendBtn.style.display = emailInput.value.trim() ? 'block' : 'none';
        });
        
        emailInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && emailInput.value.trim()) {
            sendBtn.click();
          }
        });
        
        // Send email
        sendBtn.addEventListener('click', async () => {
          const email = emailInput.value.trim();
          if (!email) {
            alert('Please enter your email');
            return;
          }
          const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
          if (!emailRegex.test(email)) {
            alert('Please enter a valid email');
            return;
          }
          currentEmail = email;
          try {
            sendBtn.disabled = true;
            sendBtn.textContent = 'Sending...';
            const response = await fetch('/api/auth/initiate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (response.ok) {
              if (data.type === 'login') {
                showCodeStep();
              } else if (data.type === 'register') {
                showRegisterSuccess(email);
              }
            } else {
              alert(data.error || 'Error sending email');
              sendBtn.disabled = false;
              sendBtn.textContent = 'Continue';
            }
          } catch (error) {
            alert('Connection error');
            sendBtn.disabled = false;
            sendBtn.textContent = 'Continue';
          }
        });
        
        // Code input handlers
        codeDigits.forEach((input, index) => {
          input.addEventListener('input', (e) => {
            clearCodeError();
            const value = e.target.value;
            if (value) {
              input.classList.add('filled');
              if (index < codeDigits.length - 1) {
                codeDigits[index + 1].focus();
              } else {
                verifyCodeBtn.style.display = 'block';
              }
            } else {
              input.classList.remove('filled');
              verifyCodeBtn.style.display = 'none';
            }
          });
          
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && index > 0) {
              codeDigits[index - 1].focus();
            }
            if (e.key === 'Enter' && verifyCodeBtn.style.display === 'block') {
              verifyCodeBtn.click();
            }
            if (e.key === 'ArrowLeft' && index > 0) {
              codeDigits[index - 1].focus();
            }
            if (e.key === 'ArrowRight' && index < codeDigits.length - 1) {
              codeDigits[index + 1].focus();
            }
          });
          
          input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = e.clipboardData.getData('text').trim();
            const digits = pasteData.replace(/[^a-zA-Z0-9]/g, '');
            if (digits.length === 8) {
              codeDigits.forEach((digit, i) => {
                digit.value = digits[i] || '';
                digit.classList.add('filled');
              });
              verifyCodeBtn.style.display = 'block';
              codeDigits[codeDigits.length - 1].focus();
            }
          });
        });
        
        // Verify code
        verifyCodeBtn.addEventListener('click', async () => {
          const code = codeDigits.map(d => d.value).join('');
          if (code.length !== 8) {
            alert('Please enter all 8 digits');
            return;
          }
          try {
            verifyCodeBtn.disabled = true;
            verifyCodeBtn.textContent = 'Verifying...';
            const response = await fetch('/api/auth/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                token: code,
                email: currentEmail 
              })
            });
            const data = await response.json();
            if (response.ok && data.token) {
              localStorage.setItem('token', data.token);
              localStorage.setItem('userEmail', currentEmail);
              window.postMessage({
                source: 'svag-gallery',
                action: 'galleryLogin',
                token: data.token,
                email: currentEmail,
                apiUrl: window.location.origin
              }, '*');
              window.location.href = '/gallery';
            } else {
              showCodeError();
              verifyCodeBtn.disabled = false;
              verifyCodeBtn.textContent = 'Verify';
            }
          } catch (error) {
            alert('Verification error');
            verifyCodeBtn.disabled = false;
            verifyCodeBtn.textContent = 'Verify';
          }
        });
        
        // Resend email
        resendEmailLink.addEventListener('click', async (e) => {
          e.preventDefault();
          try {
            resendEmailLink.textContent = 'Sending...';
            await fetch('/api/auth/initiate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: currentEmail })
            });
            resendEmailLink.textContent = 'Sent!';
            setTimeout(() => {
              resendEmailLink.textContent = 'Resend code';
            }, 2000);
          } catch (error) {
            resendEmailLink.textContent = 'Resend code';
          }
        });
        
        // Back to email
        backToEmailBtn.addEventListener('click', () => {
          showLoginForm();
        });
        
        function showCodeStep() {
          emailStep.style.display = 'none';
          registerSuccess.style.display = 'none';
          codeStep.style.display = 'flex';
          codeDigits.forEach(digit => {
            digit.value = '';
            digit.classList.remove('filled', 'error');
          });
          verifyCodeBtn.style.display = 'none';
          verifyCodeBtn.disabled = false;
          verifyCodeBtn.textContent = 'Verify';
          setTimeout(() => codeDigits[0].focus(), 100);
        }
        
        function showRegisterSuccess(email) {
          emailStep.style.display = 'none';
          codeStep.style.display = 'none';
          registerSuccess.style.display = 'flex';
          registerEmailEl.textContent = email;
        }
        
        function showLoginForm() {
          emailStep.style.display = 'flex';
          codeStep.style.display = 'none';
          registerSuccess.style.display = 'none';
          emailInput.value = '';
          sendBtn.style.display = 'none';
          sendBtn.disabled = false;
          sendBtn.textContent = 'Continue';
        }
        
        function showCodeError() {
          codeDigits.forEach(digit => {
            digit.classList.add('error');
          });
          verifyCodeBtn.textContent = 'Wrong code';
          verifyCodeBtn.disabled = true;
        }
        
        function clearCodeError() {
          codeDigits.forEach(digit => {
            digit.classList.remove('error');
          });
          verifyCodeBtn.textContent = 'Verify';
          verifyCodeBtn.disabled = false;
        }
      </script>
    </body>
    </html>
  `);
});

// Gallery page - Kompletní inline verze (z gallery.ejs + styles.css + script.js)
app.get('/gallery', (req, res) => {
  const stripeKey = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key';
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SVG Gallery - svag</title>
      <script src="https://js.stripe.com/v3/"></script>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        /* Reset */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #ffffff;
          color: #070707;
          min-height: 100vh;
        }
        
        /* Header */
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 48px;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .logo {
          font-size: 48px;
          font-weight: 700;
          letter-spacing: 0.48px;
          color: #070707;
        }
        
        .header-right {
          display: flex;
          align-items: center;
          gap: 32px;
          font-size: 14px;
          color: rgba(0, 0, 0, 0.5);
        }
        
        .usage-count { font-weight: 400; }
        .user-email { font-weight: 400; }
        
        .logout-btn {
          background: none;
          border: none;
          color: rgba(0, 0, 0, 0.5);
          font-size: 14px;
          font-weight: 400;
          cursor: pointer;
          padding: 0;
          transition: color 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .logout-btn:hover { color: #070707; }
        
        /* Filter Bar */
        .filter-bar {
          display: flex;
          align-items: center;
          gap: 32px;
          padding: 24px 48px;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .filter-btn {
          background: none;
          border: none;
          color: rgba(0, 0, 0, 0.5);
          font-size: 14px;
          font-weight: 400;
          cursor: pointer;
          padding: 0;
          transition: all 0.2s;
          font-family: 'Inter', sans-serif;
          white-space: nowrap;
        }
        .filter-btn:hover { color: #070707; }
        .filter-btn.active { color: #000000; font-weight: 500; }
        
        /* Gallery */
        .gallery-container { padding: 0; }
        
        .gallery {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          grid-auto-rows: 200px;
          width: 100%;
        }
        
        .gallery-item {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.2s;
          border: 1px solid transparent;
        }
        .gallery-item:hover { background-color: #f1f1f1; }
        .gallery-item:has(.delete-btn:hover) { background-color: #FFEFEF; }
        
        .gallery-item-inner {
          position: relative;
          width: 36px;
          height: 36px;
        }
        
        .gallery-item svg {
          width: 36px;
          height: 36px;
          display: block;
        }
        
        /* Download Tooltip */
        .download-tooltip {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          z-index: 100;
          transition: opacity 0.2s;
        }
        .download-tooltip.show { opacity: 1; }
        
        /* Item Info */
        .item-info {
          position: absolute;
          left: 8px;
          bottom: 8px;
          font-size: 12px;
          color: rgba(0, 0, 0, 0.5);
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: none;
          z-index: 1;
          white-space: nowrap;
        }
        
        .item-name {
          display: block;
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .item-size {
          position: absolute;
          right: 8px;
          bottom: 8px;
          font-size: 12px;
          color: rgba(0, 0, 0, 0.5);
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: none;
          z-index: 1;
        }
        
        .item-actions {
          position: absolute;
          top: 8px;
          right: 8px;
          display: flex;
          gap: 8px;
          opacity: 0;
          transition: opacity 0.2s;
          z-index: 2;
        }
        
        .gallery-item:hover .item-info,
        .gallery-item:hover .item-size,
        .gallery-item:hover .item-actions {
          opacity: 1;
        }
        
        .delete-btn {
          background: none;
          border: none;
          color: rgba(0, 0, 0, 0.5);
          font-size: 12px;
          font-weight: 400;
          cursor: pointer;
          transition: color 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .delete-btn:hover { color: #B70202; }
        
        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 100px 48px;
          color: rgba(0, 0, 0, 0.5);
        }
        
        .empty-state h2 {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #070707;
        }
        
        .empty-state p {
          font-size: 14px;
          font-weight: 400;
        }
        
        /* Responsive */
        @media (max-width: 1600px) {
          .gallery { grid-template-columns: repeat(7, 1fr); }
        }
        @media (max-width: 1400px) {
          .gallery { grid-template-columns: repeat(6, 1fr); }
        }
        @media (max-width: 1200px) {
          .header, .filter-bar { padding: 32px; }
          .gallery { grid-template-columns: repeat(5, 1fr); }
        }
        @media (max-width: 900px) {
          .logo { font-size: 36px; }
          .header-right { gap: 16px; font-size: 13px; }
          .filter-bar { gap: 20px; overflow-x: auto; }
          .gallery { grid-template-columns: repeat(4, 1fr); grid-auto-rows: 150px; }
        }
        @media (max-width: 600px) {
          .header { padding: 24px; }
          .user-email { display: none; }
          .filter-bar { padding: 16px 24px; }
          .gallery { grid-template-columns: repeat(3, 1fr); grid-auto-rows: 120px; }
          .gallery-item svg, .gallery-item-inner { width: 28px; height: 28px; }
      </style>
    </head>
    <body>
      <div id="gallerySection">
        <!-- Header -->
        <header class="header">
          <h1 class="logo">svag</h1>
          <div class="header-right">
            <span class="usage-count" id="usageStats">0/100</span>
            <span class="user-email" id="userEmail">Loading...</span>
            <button class="logout-btn" onclick="logout()">Logout</button>
          </div>
        </header>
        
        <!-- Filter Bar -->
        <div class="filter-bar">
          <button class="filter-btn active" data-sort="newest" onclick="sortGallery('newest')">Newest</button>
          <button class="filter-btn" data-sort="oldest" onclick="sortGallery('oldest')">Oldest</button>
          <button class="filter-btn" data-sort="a-z" onclick="sortGallery('a-z')">From A to Z</button>
          <button class="filter-btn" data-sort="z-a" onclick="sortGallery('z-a')">From Z to A</button>
          <button class="filter-btn" data-sort="largest" onclick="sortGallery('largest')">Largest</button>
          <button class="filter-btn" data-sort="smallest" onclick="sortGallery('smallest')">Smallest</button>
        </div>
        
        <!-- Gallery Grid -->
        <div class="gallery-container">
          <div class="gallery" id="gallery"></div>
          <div id="emptyState" class="empty-state" style="display: none;">
            <h2>Nothing here yet</h2>
            <p>Use the Chrome extension to add SVG icons to your gallery</p>
          </div>
        </div>
      </div>
      
      <script>
        const STRIPE_KEY = '${stripeKey}';
        const stripe = Stripe(STRIPE_KEY);
        let token = null;
        let userEmail = null;
        let allItems = [];
        let currentSort = 'newest';
        let userStats = null;
        
        async function init() {
          const urlParams = new URLSearchParams(window.location.search);
          const urlToken = urlParams.get('token');
          const urlEmail = urlParams.get('email');
          
          if (urlToken && urlEmail) {
            localStorage.setItem('token', urlToken);
            localStorage.setItem('userEmail', urlEmail);
            token = urlToken;
            userEmail = urlEmail;
            window.history.replaceState({}, '', '/gallery');
            window.postMessage({
              source: 'svag-gallery',
              action: 'galleryLogin',
              token: token,
              email: userEmail,
              apiUrl: window.location.origin
            }, '*');
          } else {
            token = localStorage.getItem('token');
            userEmail = localStorage.getItem('userEmail');
          }
          
          if (!token || !userEmail) {
            window.location.href = '/gallery/login';
            return;
          }
          
          window.addEventListener('message', (event) => {
            if (event.data && event.data.source === 'svag-extension') {
              if (event.data.action === 'extensionLogin') {
                localStorage.setItem('token', event.data.token);
                localStorage.setItem('userEmail', event.data.email);
                window.location.reload();
              }
              if (event.data.action === 'extensionLogout') {
                localStorage.removeItem('token');
                localStorage.removeItem('userEmail');
                window.location.href = '/gallery/login';
              }
            }
          });
          
          document.getElementById('userEmail').textContent = userEmail;
          await loadGallery();
          await loadStats();
        }
        
        function logout() {
          localStorage.removeItem('token');
          localStorage.removeItem('userEmail');
          window.postMessage({ source: 'svag-gallery', action: 'galleryLogout' }, '*');
          window.location.href = '/gallery/login';
        }
        
        async function loadStats() {
          try {
            const response = await fetch('/api/gallery/stats', {
              headers: { 'Authorization': \`Bearer \${token}\` }
            });
            if (response.ok) {
              userStats = await response.json();
              updateUI();
            }
          } catch (error) {
            console.error('Error loading stats:', error);
          }
        }
        
        function updateUI() {
          if (!userStats) return;
          document.getElementById('usageStats').textContent = \`\${userStats.current}/\${userStats.limit}\`;
        }
        
        async function loadGallery() {
          try {
            const response = await fetch('/api/gallery', {
              headers: { 'Authorization': \`Bearer \${token}\` }
            });
            if (response.ok) {
              allItems = await response.json();
              displayGallery(allItems);
            } else {
              localStorage.removeItem('token');
              localStorage.removeItem('userEmail');
              window.location.href = '/gallery/login';
            }
          } catch (error) {
            alert('Error loading gallery');
          }
        }
        
        function sortGallery(sortType) {
          currentSort = sortType;
          document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
          document.querySelector(\`[data-sort="\${sortType}"]\`).classList.add('active');
          const sorted = [...allItems];
          switch(sortType) {
            case 'newest':
              sorted.sort((a, b) => new Date(b.timestamp || b.created_at) - new Date(a.timestamp || a.created_at));
              break;
            case 'oldest':
              sorted.sort((a, b) => new Date(a.timestamp || a.created_at) - new Date(b.timestamp || b.created_at));
              break;
            case 'a-z':
              sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
              break;
            case 'z-a':
              sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
              break;
            case 'largest':
              sorted.sort((a, b) => parseFloat(b.size || 0) - parseFloat(a.size || 0));
              break;
            case 'smallest':
              sorted.sort((a, b) => parseFloat(a.size || 0) - parseFloat(b.size || 0));
              break;
          }
          displayGallery(sorted);
        }
        
        function isSingleColor(svg) {
          const colors = new Set();
          const fillMatches = svg.match(/fill="([^"]*?)"/gi) || [];
          fillMatches.forEach(match => {
            const color = match.match(/fill="([^"]*?)"/i)?.[1];
            if (color && color !== 'none' && color !== 'transparent' && color !== 'currentColor') {
              colors.add(color.toLowerCase().trim());
            }
          });
          const strokeMatches = svg.match(/stroke="([^"]*?)"/gi) || [];
          strokeMatches.forEach(match => {
            const color = match.match(/stroke="([^"]*?)"/i)?.[1];
            if (color && color !== 'none' && color !== 'transparent' && color !== 'currentColor') {
              colors.add(color.toLowerCase().trim());
            }
          });
          return colors.size <= 1;
        }
        
        function recolorToBlack(svg) {
          return svg
            .replace(/fill="(?!none|transparent)[^"]*"/gi, 'fill="black"')
            .replace(/stroke="(?!none|transparent)[^"]*"/gi, 'stroke="black"')
            .replace(/fill:\\s*(?!none|transparent)[^;"]*/gi, 'fill:black')
            .replace(/stroke:\\s*(?!none|transparent)[^;"]*/gi, 'stroke:black');
        }
        
        function displayGallery(items) {
          const gallery = document.getElementById('gallery');
          const emptyState = document.getElementById('emptyState');
          if (items.length === 0) {
            gallery.style.display = 'none';
            emptyState.style.display = 'block';
            return;
          }
          gallery.style.display = 'grid';
          emptyState.style.display = 'none';
          gallery.innerHTML = items.map(item => {
            const displayName = (item.name || 'icon').length > 20 
              ? (item.name || 'icon').substring(0, 17) + '...'
              : (item.name || 'icon');
            let svg = item.svg;
            if (isSingleColor(svg)) {
              svg = recolorToBlack(svg);
            }
            return \`
              <div class="gallery-item" onclick="downloadItem(event, '\${item.id}')">
                <div class="gallery-item-inner">\${svg}</div>
                <div class="download-tooltip">Downloaded!</div>
                <div class="item-info"><span class="item-name">\${displayName}</span></div>
                <div class="item-size">\${item.size || '0'}kb</div>
                <div class="item-actions">
                  <button class="delete-btn" onclick="deleteItem(event, '\${item.id}')">Delete</button>
                </div>
              </div>
            \`;
          }).join('');
        }
        
        function downloadItem(event, id) {
          if (event) event.stopPropagation();
          const item = allItems.find(i => i.id === id);
          if (!item) return;
          const blob = new Blob([item.svg], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = \`\${item.name || 'icon'}.svg\`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          const galleryItem = event.currentTarget;
          const tooltip = galleryItem.querySelector('.download-tooltip');
          if (tooltip) {
            tooltip.classList.add('show');
            setTimeout(() => tooltip.classList.remove('show'), 1000);
          }
        }
        
        async function deleteItem(event, id) {
          if (event) event.stopPropagation();
          try {
            const response = await fetch(\`/api/gallery/\${id}\`, {
              method: 'DELETE',
              headers: { 'Authorization': \`Bearer \${token}\` }
            });
            if (response.ok) {
              allItems = allItems.filter(item => item.id !== id);
              sortGallery(currentSort);
              await loadStats();
            } else {
              const error = await response.json();
              alert(error.error || 'Error deleting icon');
            }
          } catch (error) {
            alert('Error deleting icon');
          }
        }
        
        window.addEventListener('DOMContentLoaded', () => {
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('success') === 'true') {
            setTimeout(() => {
              alert('✅ Successfully upgraded to Pro!');
              window.history.replaceState({}, document.title, '/gallery');
              if (token) loadStats();
            }, 500);
          }
          if (urlParams.get('canceled') === 'true') {
            setTimeout(() => {
              alert('Payment was canceled.');
              window.history.replaceState({}, document.title, '/gallery');
            }, 500);
          }
        });
        
        init();
      </script>
    </body>
    </html>
  `);
});

// Privacy Policy stránka (vyžadováno pro Chrome Web Store)
app.get('/privacy', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Privacy Policy - SVAG</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 800px; 
          margin: 50px auto; 
          padding: 20px;
          line-height: 1.6;
          color: #333;
        }
        h1 { 
          color: #667eea; 
          margin-bottom: 10px;
          font-size: 32px;
        }
        h2 { 
          color: #764ba2; 
          margin-top: 30px;
          margin-bottom: 15px;
          font-size: 24px;
        }
        p { 
          margin-bottom: 15px;
        }
        ul {
          margin: 15px 0;
          padding-left: 30px;
        }
        li {
          margin: 8px 0;
        }
        .last-updated {
          color: #666;
          font-size: 14px;
          margin-bottom: 30px;
        }
        .contact {
          background: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <h1>Privacy Policy for SVAG</h1>
      <p class="last-updated"><strong>Last updated:</strong> ${new Date().toLocaleDateString('en-US')}</p>
      
      <h2>1. What Data We Collect</h2>
      <p>SVAG collects the following data:</p>
      <ul>
        <li><strong>Email address</strong> - for authentication and communication</li>
        <li><strong>SVG icons</strong> - that you save to your gallery</li>
        <li><strong>Icon source URLs</strong> - to identify the origin of icons</li>
        <li><strong>Usage metadata</strong> - icon count, creation date</li>
        <li><strong>Payment information</strong> - processed exclusively by Stripe, we do not store it</li>
      </ul>
      
      <h2>2. How We Use Your Data</h2>
      <p>We use your data exclusively for:</p>
      <ul>
        <li><strong>Providing the service</strong> - storing and managing SVG icons</li>
        <li><strong>Authentication</strong> - verifying your identity during login</li>
        <li><strong>Payment processing</strong> - managing Pro subscriptions</li>
        <li><strong>Service improvement</strong> - analyzing usage to improve features</li>
      </ul>
      
      <h2>3. Data Sharing</h2>
      <p>We do not share your data with third parties for marketing purposes. Data is only shared with these service providers:</p>
      <ul>
        <li><strong>Supabase</strong> - database hosting and authentication</li>
        <li><strong>Stripe</strong> - payment processing</li>
        <li><strong>Vercel</strong> - application hosting</li>
      </ul>
      <p>All these providers comply with strict security standards and GDPR.</p>
      
      <h2>4. Data Security</h2>
      <p>Your data is protected using:</p>
      <ul>
        <li><strong>SSL/TLS encryption</strong> - for data transmission</li>
        <li><strong>Encrypted storage</strong> - for database data</li>
        <li><strong>Row Level Security (RLS)</strong> - each user sees only their own data</li>
        <li><strong>Regular security audits</strong> - of infrastructure</li>
      </ul>
      
      <h2>5. Your Rights (GDPR)</h2>
      <p>You have the right to:</p>
      <ul>
        <li><strong>Access your data</strong> - you can request a copy of all your data</li>
        <li><strong>Correct your data</strong> - you can correct inaccurate information</li>
        <li><strong>Delete your data</strong> - you can request deletion of all your data</li>
        <li><strong>Export your data</strong> - you can export your icons</li>
        <li><strong>Restrict processing</strong> - you can limit how we use your data</li>
        <li><strong>Data portability</strong> - you can transfer data to another provider</li>
      </ul>
      
      <h2>6. Data Retention</h2>
      <p>We retain your data:</p>
      <ul>
        <li><strong>Active account</strong> - for the duration of service use</li>
        <li><strong>After account deletion</strong> - data is deleted within 30 days</li>
        <li><strong>Payment records</strong> - retained for 7 years (legal requirement)</li>
      </ul>
      
      <h2>7. Cookies and Tracking</h2>
      <p>SVAG uses minimal cookies:</p>
      <ul>
        <li><strong>Authentication token</strong> - to maintain login session</li>
        <li><strong>Local storage</strong> - for Chrome Extension settings</li>
      </ul>
      <p>We do not use third-party tracking cookies or analytics tools.</p>
      
      <h2>8. Children</h2>
      <p>The service is not intended for persons under 16 years of age. We do not knowingly collect personal data from children.</p>
      
      <h2>9. Privacy Policy Changes</h2>
      <p>We will notify you of significant changes by email. Minor changes will be reflected in the "Last updated" date above.</p>
      
      <div class="contact">
        <h2>10. Contact</h2>
        <p>For questions regarding privacy, contact:</p>
        <p><strong>Email:</strong> privacy@svag.app</p>
        <p><strong>Web:</strong> ${process.env.FRONTEND_URL || 'https://svag.vercel.app'}</p>
        <p>We will respond within 48 hours.</p>
      </div>
      
      <p style="margin-top: 40px; font-size: 14px; color: #999;">
        This Privacy Policy complies with GDPR (General Data Protection Regulation) and applicable legislation.
      </p>
    </body>
    </html>
  `);
});

// Admin panel (přidáme později pokud bude potřeba)
app.get('/admin', (req, res) => {
  res.send('<h1>Admin Panel - Coming Soon</h1><p>Používejte Supabase Dashboard pro správu uživatelů.</p>');
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;

// Start server pouze pro lokální development
// Vercel používá serverless functions, takže nepotřebuje app.listen()
if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('🎨  svag Backend Server (Supabase + Stripe)');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    console.log(`✅  Server běží na:       http://localhost:${PORT}`);
    console.log(`🖼️  Galerie:              http://localhost:${PORT}/gallery`);
    console.log(`🔧  Admin:                http://localhost:${PORT}/admin`);
    console.log(`❤️  Health check:         http://localhost:${PORT}/health`);
    console.log('');
    console.log('💳  Stripe configured');
    console.log('🗜️  SVG compression enabled');
    console.log('🔐  Supabase authenticated');
    console.log('═══════════════════════════════════════════════');
    console.log('');
  });
}

// Export pro Vercel serverless functions
export default app;


