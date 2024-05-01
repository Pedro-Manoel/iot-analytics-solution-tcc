# Node.js Image
FROM node:20

# Create working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN yarn install

# Copy the rest of the files
COPY . .

# Expose the port
EXPOSE 3000

# Define the user
USER node

# Run the app
CMD [ "yarn", "start" ]