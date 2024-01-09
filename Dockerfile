# build stage
FROM node:14.18.1-alpine3.11 as build-stage

WORKDIR /app
COPY package*.json ./
RUN npm install --prefer-offline
COPY . .

# RUN npm audit fix --force
ARG VITE_IS_PRODUCTION='false'
ARG VITE_BASE_URL=''
ARG VITE_APP_URL=''
ARG VITE_CHECKOUT_TEST_KEY=''
ARG VITE_CHECKOUT_PROD_KEY=''

ENV VITE_CHECKOUT_TEST_KEY=${VITE_CHECKOUT_TEST_KEY}
ENV VITE_CHECKOUT_PROD_KEY=${VITE_CHECKOUT_PROD_KEY}
ENV VITE_IS_PRODUCTION=${VITE_IS_PRODUCTION}
ENV VITE_BASE_URL=${VITE_BASE_URL}
ENV VITE_APP_URL=${VITE_APP_URL}

# build
RUN npm run build
#RUN vite build

# production stage
FROM nginx:1.20.1-alpine as production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-client.conf /etc/nginx/sites-available/nginx-client.conf
COPY start.sh start.sh
RUN sed -i 's/\r$//' start.sh  && chmod +x start.sh
CMD ["/start.sh"]