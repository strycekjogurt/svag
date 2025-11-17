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
app.set('views', './views');

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

// Root page - Landing page
app.get('/', (req, res) => {
  res.render('landing');
});

// Gallery Login page
app.get('/gallery/login', (req, res) => {
  res.render('gallery/login');
});

// Gallery page
app.get('/gallery', (req, res) => {
  const stripeKey = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key';
  res.render('gallery/gallery', { stripeKey });
});

// Privacy Policy page
app.get('/privacy', (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://svag.pro';
  res.render('privacy', { frontendUrl });
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


