# video-to-mp3-converter

### Steps to run locally

> docker run --name v2mc-mongo -p 27018:27017 -d mongo:latest

> docker run -d --hostname rmq --name v2mc-rabbit-server -p 15672:15672 -p 5672:5672 rabbitmq:3-management

Go inside every service and run
> yarn dev

Gateway service will run on port `7000`

### Ethereal mail
https://ethereal.email/messages<br />
Name - Johnathan Balistreri<br />
Username - johnathan.balistreri@ethereal.email<br />
Password - password