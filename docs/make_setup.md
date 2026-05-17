# Make.com — WhatsApp Bot Setup

## Lo que vas a necesitar tú

1. **Cuenta en Make.com** (gratis alcanza para el hackathon)
2. **WhatsApp Business Cloud API** (Meta for Developers) — gratis con número de prueba
3. **ngrok** instalado localmente, O el API deployado en Render/Railway

---

## Paso 1 — Exponer tu API

```powershell
# En la raíz del proyecto:
.\start.ps1 -ngrok
```

Ngrok te da una URL como `https://abc123.ngrok.io`. Guardala.

---

## Paso 2 — Configurar WhatsApp Business en Meta

1. Entra a https://developers.facebook.com
2. Crea una App → "Business" → "WhatsApp"
3. En "WhatsApp > Getting Started":
   - Anota el **Phone Number ID**
   - Anota el **Access Token** (temporal o permanente)
4. El número de prueba de Meta puede recibir mensajes de hasta 5 números
5. Agrega tu número como "recipient" en la consola de Meta

---

## Paso 3 — Crear el escenario en Make.com

Crea un **nuevo escenario** y agrega estos 3 módulos en cadena:

### Módulo 1: WhatsApp Business Cloud → Watch Messages
- Conecta tu cuenta de WhatsApp Business
- Elige el Phone Number ID del paso anterior
- **Webhook**: Make.com te da una URL de webhook para pegarla en Meta

### Módulo 2: HTTP → Make a request
```
Método: POST
URL: https://TU-URL-NGROK.ngrok.io/webhook/whatsapp
Headers:
  Content-Type: application/json
Body (Raw JSON):
{
  "from": "{{1.entry[].changes[].value.messages[].from}}",
  "body": "{{1.entry[].changes[].value.messages[].text.body}}",
  "type": "{{1.entry[].changes[].value.messages[].type}}",
  "media_url": "{{1.entry[].changes[].value.messages[].image.link}}",
  "media_type": "image/jpeg"
}
```

### Módulo 3: WhatsApp Business Cloud → Send a Text Message
```
Phone Number ID: [tu Phone Number ID]
To: {{1.entry[].changes[].value.messages[].from}}
Message Body: {{2.reply}}
```

---

## Paso 4 — Configurar el webhook en Meta

1. En Meta for Developers → WhatsApp → Configuration
2. Callback URL: la URL de webhook que te dio Make.com en el Módulo 1
3. Verify Token: cualquier string (ej: `radar2024`)
4. Suscribete a: `messages`

---

## Flujo completo

```
Usuario de WhatsApp
    → envía foto o texto
    → Meta recibe el mensaje
    → notifica al webhook de Make.com
    → Make.com llama a POST /webhook/whatsapp
    → API procesa (analiza imagen o responde texto)
    → Make.com envía la respuesta de vuelta por WhatsApp
```

---

## Test rápido sin WhatsApp (solo verifica que el API funciona)

```powershell
$body = @{ from = "+502123"; body = "stats"; type = "text" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8000/webhook/whatsapp" -Method POST -Body $body -ContentType "application/json"
```

Deberías recibir las estadísticas globales de la DB.
