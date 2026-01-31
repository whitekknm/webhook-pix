export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("Webhook recebido:");
  console.log(req.body);

  return res.status(200).json({
    success: true,
    message: "Webhook PIX recebido com sucesso"
  });
}
