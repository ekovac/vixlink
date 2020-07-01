FROM node:12

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

ENV VIXLINK_DB_PATH=/db
ENV VIXLINK_JWKS_URI=https://auth.01fox.io/.well-known/pomerium/jwks.json
ENV VIXLINK_JWT_HEADER="X-Pomerium-Jwt-Assertion"

# Bundle app source
COPY . .

EXPOSE 4816
CMD [ "node", "index.js" ]