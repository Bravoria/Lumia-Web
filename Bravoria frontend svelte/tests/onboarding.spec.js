import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
    // Use a unique email for each test run to avoid "already registered" errors
    const uniqueId = Date.now();
    const testEmail = `test${uniqueId}@bravor.ia`;
    const testPassword = 'password123';
    const testName = 'Dr. Teste Automatizado';

    test('deve completar cadastro, setup e chegar no dashboard', async ({ page }) => {
        // 1. Acessa a página de cadastro
        await page.goto('http://localhost:5174/cadastro');

        // 2. Preenche o formulário de cadastro
        await page.fill('#fullName', testName);
        await page.fill('#email', testEmail);
        await page.fill('#password', testPassword);

        // Clica em criar conta
        await page.click('button[type="submit"]');

        // Verifica a mensagem de sucesso
        await expect(page.locator('.success-alert')).toBeVisible({ timeout: 10000 });

        // 3. Verifica redirecionamento automático para o Setup
        await page.waitForURL('**/setup', { timeout: 15000 });

        // 4. Fluxo de Setup - Passo 1 (Informações da Clínica)
        // O setup pode demorar um pouco para carregar a sessão (skeleton)
        await expect(page.locator('h2')).toContainText('Configure sua clínica', { timeout: 10000 });

        // Preenche especialidade e cidade (obrigatórios)
        const inputs = page.locator('input');
        await inputs.nth(1).fill('Odontologia'); // Especialidade
        await inputs.nth(2).fill('São Paulo');   // Cidade

        // Clica em Continuar
        await page.click('button.btn-primary');

        // 5. Fluxo de Setup - Passo 2 (Horários)
        await expect(page.locator('h2')).toContainText('Horários de atendimento', { timeout: 5000 });

        // Clica em Finalizar Setup ✨
        await page.click('button.btn-primary');

        // 6. Verifica redirecionamento para o Dashboard
        await page.waitForURL('**/dashboard', { timeout: 20000 });

        // 7. Valida Carregamento do Dashboard (Verifica se está no Empty State ou carregado)
        await expect(page.locator('.os-v2-container')).toBeVisible({ timeout: 10000 });

        // Como a clínica acabou de ser criada, não deve ter pacientes
        // O texto deve ser "Nenhuma clínica vinculada" (se falhar) ou os cards reais (se sucesso)
        // Como criamos a clínica, o setup funcionou, e o dashboard deve exibir os cards numéricos.
        const hasCards = await page.locator('.card-os').count() > 0;
        expect(hasCards).toBeTruthy();

        // Verifica o auth guard acessando login novamente (deve redirecionar para dashboard)
        await page.goto('http://localhost:5174/login');
        await page.waitForURL('**/dashboard', { timeout: 10000 });
    });
});
