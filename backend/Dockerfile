FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN mkdir -p uploads/images uploads/videos uploads/files
EXPOSE 5000
CMD ["npm", "run", "dev"]
