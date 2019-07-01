FROM node:dubnium-stretch AS prod-module
ADD . /work
WORKDIR /work
RUN npm install --prod

FROM node:dubnium-stretch AS build
ADD . /work
WORKDIR /work
COPY --from=prod-module /work/node_modules /work/node_modules
RUN npm install && npm run build

FROM node:dubnium-stretch
COPY --from=prod-module /work/node_modules /node_modules
COPY --from=build /work/dist /dist
COPY --from=build /work/config.yaml /config.yaml
COPY --from=build /work/resource /resource
COPY --from=build /work/views /views

RUN apt update \
 && apt install -y libx11-xcb1 libxtst6 libnspr4 libnss3 libxss1 libasound2 at-spi2-core libatk-bridge2.0-0 libatspi2.0-0 libgtk-3-0

CMD ["/usr/local/bin/node", "dist/app.js"]

EXPOSE 3000
