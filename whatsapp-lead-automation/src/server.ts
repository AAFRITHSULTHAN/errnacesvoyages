import app from './app';
import { env } from './config/env';

const PORT = env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`===========================================================`);
    console.log(`🚀 WhatsApp Lead Automation Engine has successfully started!`);
    console.log(`📡 Server Port: ${PORT}`);
    console.log(`🔗 Webhook URI:  http://localhost:${PORT}/webhook/whatsapp`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
    console.log(`===========================================================`);
});
