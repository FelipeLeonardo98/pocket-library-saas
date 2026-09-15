# Infraestrutura AWS

Infraestrutura Terraform do beta público do EstudoPDF. Usa por padrão o perfil `terraform_father_account` e a região `us-east-1`.

## Recursos

- Amplify Hosting estático, publicado manualmente pelo script de deploy;
- API Gateway HTTP API com throttling de 2 req/s e burst 4;
- Lambda Node.js/TypeScript em ARM64;
- OpenAI `gpt-5-nano` com raciocínio mínimo como provedor ativo;
- Amazon Bedrock com Nova Micro preservado como provedor alternativo;
- AWS Secrets Manager para a chave da OpenAI, sem gravá-la no estado Terraform;
- DynamoDB on-demand para a quota diária;
- CloudWatch Logs com retenção de 14 dias;
- AWS Budget de US$8, com alertas absolutos em US$5 e US$8.

Todos os recursos que aceitam tags recebem `project=estudo-pdf`, `managed-by=terraform`, `source=GPT-Coders` e `environment=beta`.

## Operação

```powershell
cd backend
npm install
npm run build

cd ..\infra
terraform init
terraform plan
terraform apply
.\scripts\deploy_frontend.ps1
```

A chave bruta da beta fica somente em `backend/.env.admin`, ignorado pelo Git. O Terraform recebe apenas o SHA-256 por `infra/admin.auto.tfvars`, também ignorado. A chave da OpenAI fica no segredo `estudo-pdf/openai-api-key`; a Lambda aceita os campos JSON `key` ou `data`.

## Quota Bedrock da conta

O provedor ativo é controlado por `AI_PROVIDER`. Enquanto a quota do Bedrock estiver em zero, a implantação usa OpenAI; para retornar ao Bedrock, altere o valor para `bedrock` no módulo da API. Falhas de qualquer provedor não consomem a cota do aplicativo.

O AWS Budget monitora custos da conta AWS, não cobranças diretas da OpenAI. A cota de 30 chamadas diárias e os limites de entrada/saída mantêm a exposição desta beta pequena; configure também um orçamento no projeto da OpenAI antes de ampliar o número de usuários.
