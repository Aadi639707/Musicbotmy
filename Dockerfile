FROM node:18-slim
RUN apt-get update && apt-get install -y ffmpeg python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 7860
CMD ["npm", "start"]
