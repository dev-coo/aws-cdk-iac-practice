FROM --platform=linux/amd64 ubuntu:latest

RUN echo Updating existing packages, installing and upgrading python and pip.
RUN apt-get update -y && \
    apt-get install -y python3-pip python3-dev build-essential python3-venv

RUN python3 -m venv /env
RUN /env/bin/pip install --upgrade pip

COPY ./service /TodoListService
WORKDIR /TodoListService

RUN /env/bin/pip install flask==2.0.1 werkzeug==2.0.1
RUN /env/bin/pip install -r requirements.txt

ENTRYPOINT ["/env/bin/python3"]
CMD ["todo-service.py"]