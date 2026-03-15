/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Text } from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ siteName, siteUrl, recipient, confirmationUrl }: SignupEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme seu e-mail — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://gnghwduomveqebgclnth.supabase.co/storage/v1/object/public/email-assets/logo.png" alt="Sorte Compartilhada" width="160" height="auto" style={logo} />
        <Heading style={h1}>Confirme seu e-mail</Heading>
        <Text style={text}>
          Obrigado por se cadastrar no <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>!
        </Text>
        <Text style={text}>
          Confirme seu endereço de e-mail (<Link href={`mailto:${recipient}`} style={link}>{recipient}</Link>) clicando no botão abaixo:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirmar meu e-mail
        </Button>
        <Text style={footer}>Se você não criou uma conta, ignore este e-mail.</Text>
        <Text style={footerBrand}>© Sorte Compartilhada — sortecompartilhada.com.br</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#f4f4f5', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { backgroundColor: '#ffffff', padding: '40px 30px', borderRadius: '12px', margin: '40px auto', maxWidth: '480px' }
const logo = { margin: '0 auto 24px', display: 'block' as const }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a2e', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '14px', color: '#555555', lineHeight: '1.6', margin: '0 0 24px' }
const link = { color: '#25a55f', textDecoration: 'underline' }
const button = { backgroundColor: '#25a55f', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '10px', padding: '14px 28px', textDecoration: 'none', display: 'block' as const, textAlign: 'center' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '28px 0 0', lineHeight: '1.5' }
const footerBrand = { fontSize: '11px', color: '#bbbbbb', margin: '16px 0 0', textAlign: 'center' as const }
