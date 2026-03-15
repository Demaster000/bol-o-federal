/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Img, Preview, Text } from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu código de verificação</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://gnghwduomveqebgclnth.supabase.co/storage/v1/object/public/email-assets/logo.png" alt="Sorte Compartilhada" width="160" height="auto" style={logo} />
        <Heading style={h1}>Código de verificação</Heading>
        <Text style={text}>Use o código abaixo para confirmar sua identidade:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>Este código expira em breve. Se você não solicitou, ignore este e-mail.</Text>
        <Text style={footerBrand}>© Sorte Compartilhada — sortecompartilhada.com.br</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#f4f4f5', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { backgroundColor: '#ffffff', padding: '40px 30px', borderRadius: '12px', margin: '40px auto', maxWidth: '480px' }
const logo = { margin: '0 auto 24px', display: 'block' as const }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a2e', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '14px', color: '#555555', lineHeight: '1.6', margin: '0 0 24px' }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '28px', fontWeight: 'bold' as const, color: '#25a55f', margin: '0 0 30px', textAlign: 'center' as const, letterSpacing: '4px' }
const footer = { fontSize: '12px', color: '#999999', margin: '28px 0 0', lineHeight: '1.5' }
const footerBrand = { fontSize: '11px', color: '#bbbbbb', margin: '16px 0 0', textAlign: 'center' as const }
