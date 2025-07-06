

# Use the official Puppeteer image (includes all dependencies and Chromium)
FROM ghcr.io/puppeteer/puppeteer:latest

# Switch to root to copy files and set permissions
USER root


# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (if present)
COPY package*.json ./

# Copy the rest of the application code
COPY . .

# Set ownership to pptruser
RUN chown -R pptruser:pptruser /app
RUN apt update && apt install -y chromium

# Switch to pptruser for npm install and running the app
USER pptruser

# Install dependencies (including puppeteer)
RUN npm install

# Expose port if your app runs a server (optional)
# EXPOSE 3000

# Default command (adjust as needed)
CMD ["npm", "start"]
