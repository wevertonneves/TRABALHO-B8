FROM node:18-alpine

WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./
COPY package-lock.json ./

# Instala as dependências
RUN npm install

# Copia TODO o código (incluindo shared interno)
COPY . .

# Cria a pasta uploads se não existir
RUN mkdir -p uploads

# Expõe a porta da aplicação
EXPOSE 3001

# Comando para iniciar a aplicação
CMD ["npm", "start"]