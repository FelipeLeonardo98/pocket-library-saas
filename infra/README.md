# Infraestrutura AWS

Infraestrutura Terraform do beta público do EstudoPDF. Usa por padrão o perfil `terraform_father_account` e a região `us-east-1`.

## Recursos

- Amplify Hosting estático, publicado manualmente pelo script de deploy;
- API Gateway HTTP API com throttling de 2 req/s e burst 4;
- Lambda Node.js/TypeScript em ARM64;
- Amazon Bedrock com Nova Micro (modelo configurável por variável);
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

A chave bruta da beta fica somente em `backend/.env.admin`, ignorado pelo Git. O Terraform recebe apenas o SHA-256 por `infra/admin.auto.tfvars`, também ignorado.

## Quota Bedrock da conta

Se a API responder `Too many tokens per day` sem haver uso, consulte as quotas do Bedrock. Contas com quota de inferência igual a zero precisam ser habilitadas pela AWS antes da primeira resposta do modelo. Falhas do provedor não consomem a cota do aplicativo.
