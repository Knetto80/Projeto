const bcrypt = require('bcryptjs');
const { Categoria, Produto } = require('../models/Produto');
const Usuario = require('../models/Usuario');
const Cupom = require('../models/Cupom');

async function seed() {
  const clássicos = await Categoria.criar({ nome: 'Clássicos', descricao: 'Os sabores tradicionais da casa' });
  const veganos = await Categoria.criar({ nome: 'Veganos', descricao: 'Sem ingredientes de origem animal' });
  const semGluten = await Categoria.criar({ nome: 'Sem Glúten', descricao: 'Seguros para celíacos' });
  const especiais = await Categoria.criar({ nome: 'Especiais', descricao: 'Edições limitadas da confeitaria' });

  await Produto.criar({
    id_categoria: clássicos.id_categoria,
    nome: 'Red Velvet Gourmet',
    descricao: 'Massa aveludada de cacau suave com recheio de cream cheese tradicional.',
    ingredientes: 'Farinha de trigo, cacau, manteiga, ovos, açúcar, cream cheese, corante natural de beterraba.',
    alergenos: 'Contém glúten, leite e ovos.',
    preco: 14.9,
    quantidade_estoque: 42,
    imagens: ['/img/red-velvet.svg'],
  });

  await Produto.criar({
    id_categoria: clássicos.id_categoria,
    nome: 'Chocolate Belga 70%',
    descricao: 'Bolo intenso de chocolate belga com ganache meio amargo.',
    ingredientes: 'Farinha de trigo, chocolate belga 70%, manteiga, ovos, açúcar, creme de leite.',
    alergenos: 'Contém glúten, leite e ovos.',
    preco: 16.5,
    quantidade_estoque: 35,
    imagens: ['/img/chocolate-belga.svg'],
  });

  await Produto.criar({
    id_categoria: clássicos.id_categoria,
    nome: 'Baunilha Clássica',
    descricao: 'O favorito de sempre: massa amanteigada com buttercream de baunilha de Madagascar.',
    ingredientes: 'Farinha de trigo, manteiga, ovos, açúcar, extrato de baunilha, leite.',
    alergenos: 'Contém glúten, leite e ovos.',
    preco: 12.9,
    quantidade_estoque: 50,
    imagens: ['/img/baunilha-classica.svg'],
  });

  await Produto.criar({
    id_categoria: especiais.id_categoria,
    nome: 'Morango do Campo',
    descricao: 'Massa rosada com recheio de geleia de morango artesanal e chantininho.',
    ingredientes: 'Farinha de trigo, morango, manteiga, ovos, açúcar, creme de leite.',
    alergenos: 'Contém glúten, leite e ovos.',
    preco: 15.9,
    quantidade_estoque: 28,
    imagens: ['/img/morango-do-campo.svg'],
  });

  await Produto.criar({
    id_categoria: especiais.id_categoria,
    nome: 'Limão Siciliano',
    descricao: 'Massa cítrica com curd de limão siciliano e merengue maçaricado.',
    ingredientes: 'Farinha de trigo, limão siciliano, manteiga, ovos, açúcar.',
    alergenos: 'Contém glúten, leite e ovos.',
    preco: 15.5,
    quantidade_estoque: 20,
    imagens: ['/img/limao-siciliano.svg'],
  });

  await Produto.criar({
    id_categoria: clássicos.id_categoria,
    nome: 'Doce de Leite Argentino',
    descricao: 'Massa amanteigada recheada e coberta com doce de leite artesanal.',
    ingredientes: 'Farinha de trigo, doce de leite, manteiga, ovos, açúcar.',
    alergenos: 'Contém glúten, leite e ovos.',
    preco: 15.9,
    quantidade_estoque: 30,
    imagens: ['/img/doce-de-leite.svg'],
  });

  await Produto.criar({
    id_categoria: veganos.id_categoria,
    nome: 'Vegano de Cenoura',
    descricao: 'Massa de cenoura fofinha com cobertura de brigadeiro vegano, 100% plant-based.',
    ingredientes: 'Farinha de trigo, cenoura, óleo vegetal, açúcar, cacau, leite de coco.',
    alergenos: 'Contém glúten. Não contém leite, ovos ou derivados animais.',
    preco: 13.9,
    quantidade_estoque: 24,
    imagens: ['/img/vegano-cenoura.svg'],
  });

  await Produto.criar({
    id_categoria: semGluten.id_categoria,
    nome: 'Coco Sem Glúten',
    descricao: 'Massa leve à base de farinha de arroz com cobertura de coco fresco.',
    ingredientes: 'Farinha de arroz, coco, manteiga, ovos, açúcar, leite de coco.',
    alergenos: 'Contém leite e ovos. Não contém glúten.',
    preco: 16.9,
    quantidade_estoque: 18,
    imagens: ['/img/sem-gluten-coco.svg'],
  });

  // Cupom de boas-vindas (US-13)
  const validade = new Date();
  validade.setMonth(validade.getMonth() + 6);
  await Cupom.criar({
    codigo: 'CUPCAKE10',
    tipo_desconto: 'PERCENTUAL',
    valor_desconto: 10,
    valor_minimo_pedido: 20,
    data_validade: validade.toISOString(),
  });

  // Usuário administrador padrão para demonstração do painel (US-14, US-15)
  const senhaAdminHash = bcrypt.hashSync(require('../config').adminSenhaInicial, 10);
  await Usuario.criar({
    nome: 'Administrador (Kleber Renan)',
    email: 'admin@cupcakesgourmet.com.br',
    senha_hash: senhaAdminHash,
    tipo_usuario: 'ADMINISTRADOR',
  });
}

module.exports = seed;
