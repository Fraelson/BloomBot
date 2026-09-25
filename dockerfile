FROM ubuntu:latest

RUN apt-get update && apt-get install -y jq git curl npm wget nodejs ffmpeg bpm-tools python3-pip python-is-python3

RUN npm install -g n && hash -r && n 18

RUN npm install -g yarn && hash -r

WORKDIR /BloomBot

COPY . /BloomBot

RUN yarn

CMD [ "yarn", "run", "start" ]

