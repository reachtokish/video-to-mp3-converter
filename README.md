# video-to-mp3-converter

#### Run mongo locally inside container
```
docker run --name v2mc-mongo -p 27018:27017 -d mongo:latest
```
#### Run RabbitMQ locally inside container
```
docker run -d --hostname rmq --name v2mc-rabbit-server -p 15672:15672 -p 5672:5672 rabbitmq:3-management
```

#### Ports

----------

>gateway => 7000