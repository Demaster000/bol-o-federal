/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Img, Preview, Text } from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu link de acesso — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://gnghwduomveqebgclnth.supabase.co/storage/v1/object/public/email-assets/logo.png" alt="Sorte Compartilhada" width="160" height="auto" style={logo} />
        <Heading style={h1}>Seu link de acesso</Heading>
        <Text style={text}>
          Clique no botão abaixo para entrar na sua conta do {siteName}. Este link expira em breve.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Entrar na minha conta
        </Button>
        <Text style={footer}>Se você não solicitou este link, ignore este e-mail.</Text>
        <Text style={footerBrand}>© Sorte Compartilhada — sortecompartilhada.com.br</Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#f4f4f5', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { backgroundColor: '#ffffff', padding: '40px 30px', borderRadius: '12px', margin: '40px auto', maxWidth: '480px' }
const logo = { margin: '0 auto 24px', display: 'block' as const }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a2e', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '14px', color: '#555555', lineHeight: '1.6', margin: '0 0 24px' }
const button = { backgroundColor: '#25a55f', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '10px', padding: '14px 28px', textDecoration: 'none', display: 'block' as const, textAlign: 'center' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '28px 0 0', lineHeight: '1.5' }
const footerBrand = { fontSize: '11px', color: '#bbbbbb', margin: '16px 0 0', textAlign: 'center' as const }
