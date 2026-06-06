# Use uma imagem oficial do Node.js como base.
# Usar uma versão específica é melhor para a reprodutibilidade.
FROM node:20-slim

# Define o diretório de trabalho dentro do container para /app
WORKDIR /app

# Copia o package.json e o package-lock.json (se existir)
# Isso permite que o Docker armazene as dependências em cache.
COPY package*.json ./

# Instala apenas as dependências de produção para manter a imagem pequena.
RUN npm install --production

# Copia o restante do código-fonte da sua aplicação.
COPY . .

# O comando para iniciar a aplicação, que será executado pelo Cloud Run.
CMD ["npm", "start"]