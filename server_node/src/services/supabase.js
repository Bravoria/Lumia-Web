const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ VARIÁVEIS DO SUPABASE NÃO CONFIGURADAS NO .ENV');
}

// Usando a Service Role Key para ter acesso total e ignorar o RLS do banco (Backend Admin)
const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

module.exports = { supabase };
