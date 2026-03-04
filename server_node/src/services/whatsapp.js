const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

let sock = null; // Instância global do socket
let currentQR = null;
let currentStatus = 'disconnected'; // qr_ready, connecting, online, disconnected
let sessionStats = { msgs: 0, leads: 0, appointments: 0 };

async function initWhatsAppEngine(onMessageReceived) {
    console.log('🔄 Inicializando Motor WhatsApp Gen IA (Baileys)...');

    // AuthState salva os tokens do WhatsApp na pasta local 'auth_info_baileys'
    // Isso evita que o dono da clínica tenha que escanear o QR Code toda vez que o servidor reiniciar
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    // Tenta buscar a versão mais recente da API do WhatsApp Web real
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Versão Baileys Local: v${version.join('.')} (Latest: ${isLatest})`);

    // Cria a conexão com o WhatsApp Web
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }), // De volta pra silent para o terminal ficar limpo com o QR Code
        browser: ['LumiaOS', 'Chrome', '1.0.0'],
        version,
    });

    // Escuta mudanças de conexão (QR Code, Online, Desconectado)
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n==========================================');
            console.log('📱 NOVA SESSÃO: ESCANEIE O QR CODE ABAIXO');
            console.log('Abra o WhatsApp > Aparelhos Conectados');
            console.log('==========================================\n');
            qrcode.generate(qr, { small: true });

            // Gerar Base64 para o Frontend Svelte
            currentStatus = 'qr_ready';
            const qrImage = require('qrcode');
            qrImage.toDataURL(qr, (err, url) => {
                if (!err) currentQR = url;
            });
        }

        if (connection === 'close') {
            currentStatus = 'disconnected';
            currentQR = null;
            const reason = lastDisconnect.error?.output?.statusCode;
            const shouldReconnect = reason !== DisconnectReason.loggedOut;
            console.log(`❌ Conexão Fechada (Cód: ${reason}). Tentando Ativar Motor: ${shouldReconnect}`);

            // Tenta reconectar com Timeout para evitar CPU Spam
            if (shouldReconnect) {
                setTimeout(() => initWhatsAppEngine(onMessageReceived), 3000);
            } else {
                console.log('⚠️ LOGOUT NO CELULAR DETECTADO. Apague "auth_info_baileys" e reinicie.');
            }
        } else if (connection === 'open') {
            currentStatus = 'online';
            currentQR = null;
            console.log('✅ WhatsApp Engine Conectado com Sucesso!');
        }
    });

    // Salvar credenciais sempre que renovadas pelo servidor do WhatsApp
    sock.ev.on('creds.update', saveCreds);

    // Escuta novas mensagens chegando no WhatsApp
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return; // Se for só status update ou algo sem corpo

        // Ignorar mensagens que NÓS (a própria clínica) mandamos
        if (msg.key.fromMe) return;

        // Pegar o ID do remetente
        const remoteJid = msg.key.remoteJid;

        // Ignorar mensagens de grupos
        if (remoteJid.includes('@g.us')) return;

        // Puxar o texto da mensagem (Conversa simples ou Conversa com Anexo/Botão - Extended)
        const textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (textMessage && textMessage.trim().length > 0) {
            // Repassar o evento de Nova Mensagem para o nosso Pipeline Principal da Lumia 
            if (onMessageReceived) {
                // remove formatação extra do ID pra ficar só os números (Ex: 5511999999999)
                const clearPhone = remoteJid.replace('@s.whatsapp.net', '');
                await onMessageReceived({
                    phoneId: remoteJid,
                    phoneNumber: clearPhone,
                    text: textMessage,
                    pushName: msg.pushName || 'Lead Sem Nome'
                });
                sessionStats.msgs += 1; // Incrementa as msgs processadas na sessao
            }
        }
    });
}

/**
 * Função utilitária para enviar respostas do Agente Inteligente para o celular do paciente
 */
async function sendWhatsAppMessage(phoneId, text) {
    if (!sock) {
        console.warn('❌ Tentativa de enviar mensagem, mas WhatsApp não está online.');
        return;
    }

    // Simular botão "Digitando..." no celular do paciente antes de responder (Mais Humanizado)
    await sock.sendPresenceUpdate('composing', phoneId);

    // Fake delay de digitação (1 seg pra cada 10 letras, max 5 segs)
    const delay = Math.min(text.length * 100, 5000);
    await new Promise(r => setTimeout(r, delay));

    // Parar de digitar e Enviar Oficial
    await sock.sendPresenceUpdate('paused', phoneId);
    await sock.sendMessage(phoneId, { text: text });
    console.log(`📤 Mensagem enviada para ${phoneId}`);
}

function getWhatsAppStatus() {
    return {
        state: currentStatus,
        qrCode: currentQR,
        stats: sessionStats
    };
}

async function disconnectWhatsApp() {
    if (sock) {
        currentStatus = 'disconnected';
        currentQR = null;
        try {
            await sock.logout();
        } catch (e) {
            console.error('Erro ao deslogar:', e);
        }
    }
}

module.exports = { initWhatsAppEngine, sendWhatsAppMessage, getWhatsAppStatus, disconnectWhatsApp };
