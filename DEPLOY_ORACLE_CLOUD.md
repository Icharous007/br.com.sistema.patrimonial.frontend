# 🚀 Guia Completo: Deploy no Oracle Cloud

Olá! Este é um guia passo a passo bem detalhado para fazer o deploy da sua aplicação Angular no Oracle Cloud. Vamos juntos!

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Visão Geral da Arquitetura](#visão-geral-da-arquitetura)
3. [Passo 1: Configuração Inicial na Oracle Cloud](#passo-1-configuração-inicial-na-oracle-cloud)
4. [Passo 2: Configuração de Rede (VCN)](#passo-2-configuração-de-rede-vcn)
5. [Passo 3: Configuração de Segurança](#passo-3-configuração-de-segurança)
6. [Passo 4: Criação da Instância](#passo-4-criação-da-instância)
7. [Passo 5: Setup do Servidor](#passo-5-setup-do-servidor)
8. [Passo 6: Deploy da Aplicação](#passo-6-deploy-da-aplicação)
9. [Passo 7: Acessar sua Aplicação](#passo-7-acessar-sua-aplicação)
10. [Troubleshooting](#troubleshooting)

---

## Pré-requisitos

✅ **Necessário:**

- Conta ativa no Oracle Cloud
- Cartão de crédito vinculado (para pagar recursos)
- SSH client instalado no seu computador (Git Bash, PowerShell, Terminal)
- Conhecimento básico de terminal/linha de comando
- Um domínio (opcional, mas recomendado)

✅ **Informações da aplicação:**

- Tecnologia: **Angular 21**
- Node.js: **18.x ou superior**
- Tipo: Single Page Application (SPA)
- Build: `npm run build`
- Saída: `dist/` folder

---

## Visão Geral da Arquitetura

Seu Computador
    ↓
  [Internet]
    ↓
Oracle Cloud
├── VCN (Virtual Cloud Network)
│   └── Subnet Pública
│       └── Instância Compute (Linux)
│           ├── Node.js 18+
│           ├── Nginx (servidor web)
│           └── Aplicação Angular (dist)
├── Security Group
│   ├── Porta 22 (SSH - acesso remoto)
│   ├── Porta 80 (HTTP)
│   └── Porta 443 (HTTPS - SSL/TLS)
└── Domínio (DNS apontando para IP público)

---

## Passo 1: Configuração Inicial na Oracle Cloud

### 1.1 - Acessar o Console Oracle Cloud

1. Abra seu navegador e vá para: <https://www.oracle.com/cloud/>
2. Clique em **"Sign In"** ou **"Console"**
3. Faça login com suas credenciais
4. Você verá o **Dashboard do Oracle Cloud**

### 1.2 - Localizar Compartimento (Compartment)

- No menu superior esquerdo, clique no **Menu Hambúrguer (☰)**
- Procure por **"Identity & Security"** → **"Compartments"**
- Anote o nome do seu **compartment padrão** (geralmente é "root")
- Você vai precisar desse nome mais tarde

### 1.3 - Configurar Quotas (Limites)

- Clique no **Menu Hambúrguer (☰)**
- Vá em **"Governance"** → **"Limits, Quotas and Usage"**
- Verifique se tem quota para:
  - **Compute Instances**: pelo menos 1
  - **VCNs**: pelo menos 1
  - **IP addresses**: pelo menos 1 público

Se estiver sem quota, clique em **"Request a Service Limit Increase"** e preencha o formulário.

---

## Passo 2: Configuração de Rede (VCN)

### O que é VCN?

Uma **VCN (Virtual Cloud Network)** é como um data center virtual. É o espaço isolado onde sua instância vai viver. Dentro dela, você cria subnets (sub-redes).

### 2.1 - Criar uma VCN

1. No **Menu Hambúrguer (☰)**, vá em **"Networking"** → **"Virtual Cloud Networks"**
2. Clique em **"Start VCN Wizard"**
3. Selecione **"VCN with Internet Connectivity"** e clique em **"Start VCN Wizard"**

### 2.2 - Preencher Detalhes da VCN

VCN Name: meu-app-vcn
(ou qualquer nome que você queira)

VCN CIDR Block: 10.0.0.0/16
(esse é o padrão, pode deixar assim)

Compartment: [seu-compartment-padrão]

Public Subnet CIDR: 10.0.1.0/24
(deixar o padrão é ok)

Private Subnet CIDR: 10.0.2.0/24
(não vamos usar, mas deixar criado não dói)

1. Clique em **"Create"**
2. Aguarde aparecer a mensagem de sucesso
3. Clique em **"View Virtual Cloud Network"** (ou procure pelo nome que criou)

### 2.3 - Anotar Informações Importantes

Na página da VCN, anote:

- **VCN ID**: (vamos usar depois)
- **Public Subnet ID**: (vamos usar depois)

---

## Passo 3: Configuração de Segurança

### O que é Security Group?

Um **Security Group** é como um firewall. Define quem pode acessar sua instância e por quais portas.

### 3.1 - Criar um Security Group

1. Na mesma página da VCN, procure por **"Security Lists"** na seção de recursos
2. Clique em **"Create Security List"**

Name: meu-app-security-list
Compartment: [seu-compartment]
VCN: [VCN que você acabou de criar]

1. Clique em **"Create"**

### 3.2 - Adicionar Regras de Entrada (Ingress Rules)

Você vai ver uma página para adicionar regras. **Adicione 3 regras:**

**Regra 1 - SSH (para você acessar o servidor)**

Stateless: ✓ (deixar marcado)
Protocol: TCP
Source: 0.0.0.0/0
Source port range: [deixar vazio]
Destination port range: 22

Clique em **"Add Ingress Rules"**

**Regra 2 - HTTP (porta 80)**

Stateless: ✓
Protocol: TCP
Source: 0.0.0.0/0
Source port range: [deixar vazio]
Destination port range: 80

Clique em **"Add Ingress Rules"**

**Regra 3 - HTTPS (porta 443)**

Stateless: ✓
Protocol: TCP
Source: 0.0.0.0/0
Source port range: [deixar vazio]
Destination port range: 443

Clique em **"Add Ingress Rules"**

### 3.3 - Adicionar Regras de Saída (Egress Rules)

**Regra 1 - Permitir tudo para fora**

Stateless: ✓
Protocol: All Protocols
Destination: 0.0.0.0/0

### 3.4 - Associar Security List à Subnet

1. Volte para a página da **VCN**
2. Clique em **"Public Subnet"** ou **"subnets"**
3. Clique na subnet pública
4. Em **"Security Lists"**, clique em **"Edit"**
5. Marque o **security list que você criou**
6. Clique em **"Save"**

---

## Passo 4: Criação da Instância

### O que é Instância?

Uma **Instância** é basicamente um computador virtual que roda na nuvem. Nela você vai instalar Node.js e rodar sua aplicação.

### 4.1 - Criar a Instância

1. No **Menu Hambúrguer (☰)**, vá em **"Compute"** → **"Instances"**
2. Clique em **"Create Instance"**

### 4.2 - Configurar a Instância

Name: meu-app-frontend
(ou qualquer nome que você queira)

Compartment: [seu-compartment-padrão]

### 4.3 - Escolher Imagem (Sistema Operacional)

Procure por **"Change Image"**:

- Selecione: **"Canonical Ubuntu"** (versão **24.04 LTS** ou **22.04 LTS**)
- LTS = Long Term Support = suporte de 5 anos ✅

### 4.4 - Escolher Forma (Shape - tipo de máquina)

Procure por **"Change Shape"**:

**Para começar (gratuito com free tier):**

Ampere (ARM-based)
└── VM.Standard.A1.Compute
    └── Selecionar 4 OCPUs (é a máxima do free tier)
    └── 24 GB de RAM (gratuito no free tier)

**Ou (se quiser x86, custa mais barato que Ampere):**

Intel (x86-based)
└── VM.Standard.E5.Compute
    └── 1 OCPU
    └── 8 GB RAM
    (este custa uns $30-50 por mês)

**Recomendação:** Use o **Ampere A1.Compute** se estiver no free tier!

### 4.5 - Networking (Rede)

Virtual Cloud Network: [a VCN que você criou]
Subnet: [a subnet pública que você criou]
Assign a public IP address: ✓ SIM (marque!)

Isso é essencial! Sem IP público você não consegue acessar.

### 4.6 - Chave SSH (Super importante!)

Vai aparecer uma opção para gerar chave SSH. **Tem duas opções:**

**Opção 1 - Deixar Oracle gerar (mais fácil):**

- Selecione: **"Generate a key pair for me"**
- Clique em **"Download Private Key"**
- **Guarde esse arquivo em um local seguro!**
- Esse arquivo permite você acessar a instância

**Opção 2 - Usar sua própria chave:**

- Se você já tem uma chave SSH, selecione **"Paste a public key"**
- Copie o conteúdo do seu `~/.ssh/id_rsa.pub`

### 4.7 - Criar Instância

Clique em **"Create"** e aguarde (pode levar 2-3 minutos).

Quando terminar, você verá a instância em estado **"Running"** ✅

### 4.8 - Anotar o IP Público

Na página da instância, procure por **"Primary VNIC"** → **"IPv4 Address"**

Anote esse IP! É algo como: `150.136.123.45`

---

## Passo 5: Setup do Servidor

Agora vamos conectar na instância e instalar tudo que precisamos.

### 5.1 - Conectar via SSH

**No Windows (PowerShell):**

powershell

# Navegue até onde você salvou a chave

cd C:\Caminho\da\chave

# Mude permissões (importante!)

icacls "seu-arquivo-chave.key" /inheritance:r /grant:r "$env:UserName:(F)"

# Conecte

ssh -i seu-arquivo-chave.key ubuntu@150.136.123.45

**No Mac/Linux:**

bash

# Navegue até onde você salvou a chave

cd ~/Caminho/da/chave

# Mude permissões (muito importante!)

chmod 600 seu-arquivo-chave.key

# Conecte

ssh -i seu-arquivo-chave.key ubuntu@150.136.123.45

Quando pedir para confirmar, **digite `yes`** e pressione Enter.

Pronto! Você está conectado ao servidor! 🎉

### 5.2 - Atualizar Sistema

bash
sudo apt update && sudo apt upgrade -y

Isso pode demorar alguns minutos. Deixe terminar.

### 5.3 - Instalar Node.js e npm

bash

# Instalar Node.js LTS

curl -fsSL <https://deb.nodesource.com/setup_20.x> | sudo -E bash -
sudo apt install -y nodejs

**Verificar instalação:**

bash
node --version
npm --version

Deve aparecer algo como:

v20.11.0
10.2.4

### 5.4 - Instalar Nginx (Servidor Web)

bash
sudo apt install -y nginx

**Iniciar Nginx:**

bash
sudo systemctl start nginx
sudo systemctl enable nginx

**Verificar se está rodando:**

bash
sudo systemctl status nginx

### 5.5 - Instalar Git (para clonar seu projeto)

bash
sudo apt install -y git

### 5.6 - Criar Diretório para a Aplicação

bash
sudo mkdir -p /var/www/seu-app
sudo chown -R $USER:$USER /var/www/seu-app

---

## Passo 6: Deploy da Aplicação

### 6.1 - Clonar o Repositório

Se seu projeto está no GitHub:

bash
cd /var/www/seu-app
git clone <https://github.com/seu-usuario/seu-repositorio.git> .

Se você não usa Git, pode fazer upload via SCP.

### 6.2 - Instalar Dependências

bash
cd /var/www/seu-app
npm install

Isso vai instalar todos os pacotes Angular e dependências (pode demorar 2-5 minutos).

### 6.3 - Fazer Build da Aplicação

bash
npm run build

A build vai criar um folder `dist/` com todos os arquivos prontos para produção.

**Verificar se foi criada:**

bash
ls -la dist/

Você deve ver arquivos `.js`, `.css`, `index.html`, etc.

### 6.4 - Configurar Nginx

Você precisa dizer ao Nginx onde está a aplicação.

**Criar arquivo de configuração:**

bash
sudo nano /etc/nginx/sites-available/seu-app

Copie e cole isto (ajuste conforme necessário):

nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    root /var/www/seu-app/dist/sistema-patrimonial-frontend/browser;
    index index.html;

    # Configuração para SPA (Angular)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/xml text/javascript 
               application/javascript application/xml+rss 
               application/rss+xml application/atom+xml 
               image/svg+xml;
}

**Salvar:** Pressione `Ctrl + X`, depois `Y`, depois `Enter`

### 6.5 - Ativar Configuração do Nginx

bash
sudo ln -s /etc/nginx/sites-available/seu-app /etc/nginx/sites-enabled/seu-app

# Remover configuração padrão

sudo rm -f /etc/nginx/sites-enabled/default

### 6.6 - Testar Configuração do Nginx

bash
sudo nginx -t

Deve aparecer:

nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration will be successful

### 6.7 - Reiniciar Nginx

bash
sudo systemctl restart nginx

---

## Passo 7: Acessar sua Aplicação

### 7.1 - Via IP Público

Abra seu navegador e vá para:

<http://150.136.123.45>

(Substitua pelo IP que você anotou)

Se tudo estiver certo, você verá sua aplicação Angular rodando! 🚀

### 7.2 - Adicionar Domínio (Opcional)

Se você tem um domínio, pode apontá-lo para sua aplicação:

1. Vá até seu registrador de domínio (GoDaddy, Namecheap, etc)
2. Procure por **"DNS Records"** ou **"A Records"**
3. Crie um registro `A`:

Type: A
Name: @ (ou subdomínio, tipo www)
Value: 150.136.123.45
TTL: 3600

1. Espere 5-15 minutos para o DNS propagar
2. Acesse seu domínio no navegador

### 7.3 - HTTPS (SSL/TLS) com Let's Encrypt (RECOMENDADO!)

Fazer seu site funcionar com HTTPS (aquele cadeado no navegador) é super importante!

bash

# Instalar Certbot

sudo apt install -y certbot python3-certbot-nginx

# Gerar certificado (substitua seu-dominio.com pelo seu)

sudo certbot certonly --nginx -d seu-dominio.com -d <www.seu-dominio.com>

**Se não tiver domínio ainda, pule esta parte.**

Se funcionou, atualize a configuração do Nginx:

bash
sudo nano /etc/nginx/sites-available/seu-app

Substitua o conteúdo por isto:

nginx
server {
    listen 80;
    listen [::]:80;
    server_name seu-dominio.com <www.seu-dominio.com>;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name seu-dominio.com www.seu-dominio.com;

    ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;

    root /var/www/seu-app/dist/sistema-patrimonial-frontend/browser;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css text/xml text/javascript 
               application/javascript application/xml+rss 
               application/rss+xml application/atom+xml 
               image/svg+xml;
}

Restart Nginx:

bash
sudo systemctl restart nginx

Pronto! Seu site agora funciona com HTTPS! 🔒

---

## 🔧 Atualizações Futuras

Quando você fizer mudanças no código e quiser fazer novo deploy:

bash
cd /var/www/seu-app

# Puxar últimas mudanças

git pull origin master

# Instalar novas dependências (se houver)

npm install

# Fazer build

npm run build

# Reiniciar Nginx

sudo systemctl restart nginx

Pronto! Sua aplicação está atualizada! ✅

---

## 🆘 Troubleshooting

### Problema: "Connection refused" (Não consegue conectar via SSH)

**Solução:**

1. Verifique se a chave SSH tem permissões corretas:

   bash
   chmod 600 seu-arquivo-chave.key

2. Verifique se o Security Group permite porta 22 (SSH)

3. Aguarde 2-3 minutos após criar a instância (leva um tempo para ativar)

### Problema: Nginx retorna erro 404

**Solução:**

1. Verifique se a build foi feita:

   bash
   ls -la /var/www/seu-app/dist/

2. Verifique o caminho exato na sua build:

   bash
   find /var/www/seu-app/dist -name "index.html"

3. Atualize o `root` na configuração do Nginx com o caminho correto

4. Teste a configuração:

   bash
   sudo nginx -t
   sudo systemctl restart nginx

### Problema: Não consegue clonar repositório do GitHub

**Solução (usando HTTPS):**

bash
git clone <https://github.com/seu-usuario/seu-repositorio.git> .

**Ou (usando SSH - mais seguro):**

bash

# Gerar chave SSH no servidor

ssh-keygen -t ed25519 -C "<seu-email@gmail.com>"

# Adicionar chave pública ao seu GitHub

cat ~/.ssh/id_ed25519.pub

# Depois clonar normalmente

git clone <git@github.com>:seu-usuario/seu-repositorio.git .

### Problema: Domínio não está funcionando

**Solução:**

1. Verifique se o DNS está propagado:

   bash
   nslookup seu-dominio.com

2. Aguarde até 24 horas para propagar completamente

3. Verifique se a configuração do Nginx tem o domínio correto:

   bash
   sudo nginx -T | grep server_name

### Problema: Certificado SSL não está gerando

**Solução:**

1. Verifique se Nginx está rodando:

   bash
   sudo systemctl status nginx

2. Tente com flag `--standalone`:

   bash
   sudo certbot certonly --standalone -d seu-dominio.com

3. Se ainda não funcionar, verifique logs:

   bash
   sudo tail -f /var/log/letsencrypt/letsencrypt.log

---

## 📊 Monitoramento

### Ver logs do Nginx

bash

# Último 50 linhas

sudo tail -f /var/log/nginx/access.log

# Erros

sudo tail -f /var/log/nginx/error.log

### Ver uso de memória/CPU

bash

# Instalação (se não tiver)

sudo apt install -y htop

# Executar

htop

### Verificar espaço em disco

bash
df -h

---

## 💡 Dicas Adicionais

### 1. Fazer Deploy Automático (CI/CD)

Você pode configurar GitHub Actions para fazer deploy automático quando você fizer push:

yaml

# .github/workflows/deploy.yml

name: Deploy

on:
  push:
    branches: [master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run build
      - name: Upload to Server
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          scp -r dist/* ubuntu@seu-ip:/var/www/seu-app/dist/
          ssh -i ~/.ssh/id_rsa ubuntu@seu-ip 'sudo systemctl restart nginx'

### 2. Fazer Backup Regular

bash

# Criar backup manual

cd /var/www/seu-app
tar -czf ~/backup-$(date +%Y-%m-%d).tar.gz dist/

# Enviar para seu PC

scp -i chave.key ubuntu@seu-ip:~/backup-*.tar.gz ./

### 3. Monitoração com PM2 (se quiser Node.js direto)

Alternativa ao Nginx para servir a aplicação:

bash
npm install -g pm2

# Criar arquivo app.js

echo "const express = require('express'); const app = express(); app.use(express.static('dist/sistema-patrimonial-frontend/browser')); app.get('*', (req, res) => res.sendFile(__dirname + '/dist/sistema-patrimonial-frontend/browser/index.html')); app.listen(3000);" > app.js

# Iniciar com PM2

pm2 start app.js --name "seu-app"
pm2 startup
pm2 save

---

## 🎓 Resumo do Que Você Vai Fazer

| Passo | O Quê | Tempo |
|-------|-------|-------|
| 1 | Criar VCN e subnet | 5 min |
| 2 | Criar Security Group | 5 min |
| 3 | Criar Instância | 10 min |
| 4 | Conectar via SSH | 5 min |
| 5 | Instalar Node.js e Nginx | 10 min |
| 6 | Clonar e fazer build | 10 min |
| 7 | Configurar e testar | 10 min |
| **TOTAL** | | **~55 minutos** |

---

## 🎉 Pronto

Parabéns! Sua aplicação está no ar! 🚀

Se tiver dúvidas em qualquer passo, pode chamar!

---

**Última atualização:** Maio 2026
**Versões:** Angular 21, Node.js 20, Ubuntu 22.04 LTS
