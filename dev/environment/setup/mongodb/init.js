db = db.getSiblingDB('admin')

db.createUser({
    "user": "aws_user",
    "pwd": "aws_password",
    "roles": [
        { "role": "dbOwner", "db": "local" },
        { "role": "dbOwner", "db": "admin" },
        { "role": "dbOwner", "db": "config" },
        { "role": "dbOwner", "db": "aws" }
    ]
});

db = db.getSiblingDB('aws')

db.createUser({
    "user": "aws_user",
    "pwd": "aws_password",
    "roles": [
        { "role": "dbOwner", "db": "local" },
        { "role": "dbOwner", "db": "admin" },
        { "role": "dbOwner", "db": "config" },
        { "role": "dbOwner", "db": "aws" }
    ]
});