import { MongoClient } from 'mongodb';
import { Client, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'Botvendas';
let mongoClient;

// Discord client (singleton)
const client = new Client({ intents: 32767 });
if (!client.isReady?.()) {
  client.login(process.env.TOKEN);
}

async function getDB() {
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
  }
  return mongoClient.db(DB_NAME);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const body = req.body;
    console.log('Webhook recebido:', body);

    if (body.type !== 'pix.payment.received') {
      return res.status(200).json({ message: 'Evento ignorado' });
    }

    const { amount_cents, payer_name } = body.data;
    const valorRecebido = amount_cents / 100;

    const db = await getDB();
    const collection = db.collection('estoque');

    const produtos = await collection.find({ CarrinhosAbertos: { $exists: true } }).toArray();
    if (!produtos.length) {
      return res.status(200).json({ message: 'Nenhum carrinho encontrado' });
    }

    for (const produto of produtos) {
      for (const [userId, carrinho] of Object.entries(produto.CarrinhosAbertos)) {
        if (Math.abs(carrinho.ValorTotal - valorRecebido) < 0.01) {

          const thread = await client.channels.fetch(carrinho.threadId);
          if (!thread) continue;

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`confirmar_pagamento:${produto._id}:${userId}`)
              .setLabel('Já paguei')
              .setStyle(ButtonStyle.Success)
          );

          const embed = new EmbedBuilder()
            .setColor('#cdff03')
            .setDescription(`Pagamento PIX detectado no valor de R$ ${valorRecebido}`);

          await thread.send({ embeds: [embed], components: [row] });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Webhook PIX recebido com sucesso'
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
