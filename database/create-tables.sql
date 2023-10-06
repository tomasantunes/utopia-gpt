CREATE DATABASE utopia_gpt;
USE utopia_gpt;

CREATE TABLE posts (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    parent_id INT(11) NOT NULL,
    bot_id INT(11) NOT NULL,
    author VARCHAR(256) NOT NULL,
    is_user BOOLEAN NOT NULL,
    content TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE logins (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    is_valid BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bots (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    author VARCHAR(256) NOT NULL,
    initial_prompt TEXT NOT NULL,
    initial_answer TEXT NOT NULL,
    role VARCHAR(128) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE scheduled_tasks (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    bot_id VARCHAR(256) NOT NULL,
    prompt TEXT NOT NULL,
    time TIME NOT NULL,
    days VARCHAR(256) DEFAULT '',
    type VARCHAR(128) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);