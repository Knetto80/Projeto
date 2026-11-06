-- =========================================================================
-- CUPCAKES GOURMET — PROJETO FÍSICO DO BANCO DE DADOS RELACIONAL (3FN)
-- SGBD alvo: MySQL 8+ / PostgreSQL 14+ (sintaxe MySQL abaixo; ver notas PG)
-- Baseado no Relatório Consolidado SP1 (Kleber Renan) e refinado para SP2.
-- =========================================================================

-- Para execução manual (MySQL Workbench / linha de comando):
CREATE DATABASE IF NOT EXISTS cupcakes_gourmet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cupcakes_gourmet;

-- 1. Usuários (US-01, US-02, US-03) ---------------------------------------
CREATE TABLE tb_usuario (
    id_usuario        INT AUTO_INCREMENT PRIMARY KEY,
    nome              VARCHAR(100) NOT NULL,
    email             VARCHAR(120) NOT NULL UNIQUE,
    senha_hash        VARCHAR(255) NOT NULL,
    tipo_usuario      ENUM('CLIENTE', 'ADMINISTRADOR') DEFAULT 'CLIENTE' NOT NULL,
    tentativas_falhas INT DEFAULT 0 NOT NULL,
    conta_bloqueada   BOOLEAN DEFAULT FALSE NOT NULL,
    data_cadastro     TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Recuperação de senha (US-16) ------------------------------------------
CREATE TABLE tb_recuperacao_senha (
    id_recuperacao  INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario      INT NOT NULL,
    token           VARCHAR(255) NOT NULL UNIQUE,
    data_expiracao  TIMESTAMP NOT NULL,
    utilizado       BOOLEAN DEFAULT FALSE NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES tb_usuario(id_usuario) ON DELETE CASCADE
);

-- 3. Endereços (US-09, US-17) ----------------------------------------------
CREATE TABLE tb_endereco (
    id_endereco  INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario   INT NOT NULL,
    cep          VARCHAR(9) NOT NULL,
    logradouro   VARCHAR(150) NOT NULL,
    numero       VARCHAR(20) NOT NULL,
    complemento  VARCHAR(50),
    bairro       VARCHAR(80) NOT NULL,
    cidade       VARCHAR(80) NOT NULL,
    uf           CHAR(2) NOT NULL,
    e_padrao     BOOLEAN DEFAULT FALSE NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES tb_usuario(id_usuario) ON DELETE CASCADE
);

-- 4. Categorias e Produtos (US-04, US-05, US-06, US-14) --------------------
CREATE TABLE tb_categoria (
    id_categoria  INT AUTO_INCREMENT PRIMARY KEY,
    nome          VARCHAR(50) NOT NULL UNIQUE,
    descricao     VARCHAR(255),
    ativa         BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE TABLE tb_produto (
    id_produto          INT AUTO_INCREMENT PRIMARY KEY,
    id_categoria        INT NOT NULL,
    nome                VARCHAR(100) NOT NULL UNIQUE,
    descricao           TEXT NOT NULL,
    ingredientes        TEXT NOT NULL,
    alergenos           TEXT,
    preco               DECIMAL(10,2) NOT NULL CHECK (preco > 0.00),
    quantidade_estoque  INT NOT NULL DEFAULT 0 CHECK (quantidade_estoque >= 0),
    ativo               BOOLEAN DEFAULT TRUE NOT NULL,
    FOREIGN KEY (id_categoria) REFERENCES tb_categoria(id_categoria)
);

-- 5. Galeria de imagens do produto (US-06, US-14) ---------------------------
CREATE TABLE tb_produto_imagem (
    id_imagem    INT AUTO_INCREMENT PRIMARY KEY,
    id_produto   INT NOT NULL,
    url_imagem   VARCHAR(255) NOT NULL,
    e_principal  BOOLEAN DEFAULT FALSE NOT NULL,
    FOREIGN KEY (id_produto) REFERENCES tb_produto(id_produto) ON DELETE CASCADE
);

-- 6. Cupons de desconto (US-13) ---------------------------------------------
CREATE TABLE tb_cupom (
    id_cupom             INT AUTO_INCREMENT PRIMARY KEY,
    codigo               VARCHAR(30) NOT NULL UNIQUE,
    tipo_desconto        ENUM('PERCENTUAL', 'VALOR_FIXO') NOT NULL,
    valor_desconto       DECIMAL(10,2) NOT NULL CHECK (valor_desconto > 0.00),
    valor_minimo_pedido  DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    data_validade        TIMESTAMP NOT NULL,
    ativo                BOOLEAN DEFAULT TRUE NOT NULL
);

-- 7. Carrinho de compras e itens (US-07, US-08) ------------------------------
CREATE TABLE tb_carrinho (
    id_carrinho       INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario        INT NOT NULL UNIQUE,
    data_atualizacao  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES tb_usuario(id_usuario) ON DELETE CASCADE
);

CREATE TABLE tb_item_carrinho (
    id_item_carrinho  INT AUTO_INCREMENT PRIMARY KEY,
    id_carrinho       INT NOT NULL,
    id_produto        INT NOT NULL,
    quantidade        INT NOT NULL CHECK (quantidade >= 1 AND quantidade <= 50),
    FOREIGN KEY (id_carrinho) REFERENCES tb_carrinho(id_carrinho) ON DELETE CASCADE,
    FOREIGN KEY (id_produto) REFERENCES tb_produto(id_produto),
    UNIQUE (id_carrinho, id_produto)
);

-- 8. Pedidos e itens do pedido (US-10, US-11, US-12, US-15, US-17) ----------
CREATE TABLE tb_pedido (
    id_pedido        INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario       INT NOT NULL,
    id_endereco      INT NOT NULL,
    id_cupom         INT NULL,
    numero_pedido    VARCHAR(20) NOT NULL UNIQUE,
    data_pedido      TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    valor_subtotal   DECIMAL(10,2) NOT NULL,
    valor_desconto   DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    valor_frete      DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    valor_total      DECIMAL(10,2) NOT NULL CHECK (valor_total >= 10.00),
    forma_pagamento  ENUM('CARTAO_CREDITO', 'PIX', 'DINHEIRO') NOT NULL,
    status_pedido    ENUM('RECEBIDO', 'EM_PRODUCAO', 'SAIU_PARA_ENTREGA', 'ENTREGUE', 'CANCELADO')
                     DEFAULT 'RECEBIDO' NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES tb_usuario(id_usuario),
    FOREIGN KEY (id_endereco) REFERENCES tb_endereco(id_endereco),
    FOREIGN KEY (id_cupom) REFERENCES tb_cupom(id_cupom)
);

CREATE TABLE tb_item_pedido (
    id_item_pedido  INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido       INT NOT NULL,
    id_produto      INT NOT NULL,
    quantidade      INT NOT NULL CHECK (quantidade >= 1),
    preco_unitario  DECIMAL(10,2) NOT NULL,
    subtotal        DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (id_pedido) REFERENCES tb_pedido(id_pedido) ON DELETE CASCADE,
    FOREIGN KEY (id_produto) REFERENCES tb_produto(id_produto)
);

-- 9. Histórico de status e avaliações (US-11, US-15, US-18) -----------------
CREATE TABLE tb_historico_status_pedido (
    id_historico     INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido        INT NOT NULL,
    status_anterior  VARCHAR(30),
    status_novo      VARCHAR(30) NOT NULL,
    data_alteracao   TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (id_pedido) REFERENCES tb_pedido(id_pedido) ON DELETE CASCADE
);

CREATE TABLE tb_avaliacao (
    id_avaliacao    INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido       INT NOT NULL,
    id_usuario      INT NOT NULL,
    id_produto      INT NOT NULL,
    nota            INT NOT NULL CHECK (nota BETWEEN 1 AND 5),
    comentario      TEXT,
    data_avaliacao  TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (id_pedido) REFERENCES tb_pedido(id_pedido),
    FOREIGN KEY (id_usuario) REFERENCES tb_usuario(id_usuario),
    FOREIGN KEY (id_produto) REFERENCES tb_produto(id_produto),
    UNIQUE (id_pedido, id_produto)
);

-- Índices de apoio para consultas frequentes (evoluções KaiZen SP2) ---------
CREATE INDEX idx_produto_categoria ON tb_produto (id_categoria);
CREATE INDEX idx_pedido_usuario    ON tb_pedido (id_usuario);
CREATE INDEX idx_pedido_status     ON tb_pedido (status_pedido);
CREATE INDEX idx_avaliacao_produto ON tb_avaliacao (id_produto);

-- Notas de portabilidade PostgreSQL: substituir AUTO_INCREMENT por
-- GENERATED ALWAYS AS IDENTITY, e ENUM por CHECK (coluna IN (...)) ou tipo
-- ENUM nativo criado via CREATE TYPE.
