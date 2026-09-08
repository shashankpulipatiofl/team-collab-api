FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies (package*.json files)
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Default command
CMD ["npm", "run", "dev"]
