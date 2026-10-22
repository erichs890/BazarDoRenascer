# Bazar do Renascer - Plataforma Digital de Bazar Solidário
## Trabalho de Definição de Indicadores Estratégicos de TI

> **Nota metodológica:** o Bazar do Renascer é um sistema real, desenvolvido como projeto acadêmico (Progressive Web App com backend em PostgreSQL/Supabase). Já os **dados quantitativos de operação apresentados neste trabalho são fictícios e simulados para fins acadêmicos**: a plataforma ainda não acumulou seis meses de histórico. Os números foram construídos para representar uma operação plausível e permitir o cálculo, o acompanhamento, a comparação e a interpretação dos indicadores propostos.

---

## 1. Introdução

A Tecnologia da Informação (TI) deixou de atuar apenas como suporte operacional e passou a exercer papel estratégico em organizações que dependem de sistemas digitais para executar suas atividades. Isso vale inclusive para o terceiro setor: em uma instituição que mantém um bazar beneficente, indisponibilidades, lentidão ou falhas na finalização de uma compra não geram apenas incômodo técnico — reduzem diretamente a arrecadação destinada às ações sociais.

Nesse contexto, indicadores de desempenho de TI permitem transformar eventos operacionais em informações quantitativas capazes de apoiar decisões. Um indicador bem definido não se limita a apresentar um número: ele deve possuir objetivo, fórmula, periodicidade, unidade de medida, fonte dos dados, responsável, regras de negócio e procedimento de coleta.

Este trabalho apresenta o **Bazar do Renascer**, plataforma digital de um bazar solidário mantido por um centro espírita. A partir do contexto do negócio, são definidos objetivos estratégicos de TI, objetivos de melhoria e cinco indicadores estratégicos. Para demonstrar sua aplicação, é construído um cenário com dados simulados de seis meses de operação.

Um aspecto distingue este caso de uma organização comum: aqui, **cada falha técnica tem tradução social direta**. Uma hora fora do ar não significa apenas perda de receita — significa peças que deixaram de ser vendidas e recursos que deixaram de chegar a quem depende deles. Essa tradução é explorada ao longo do trabalho.

---

## 2. Contextualização da organização

### 2.1 O que é o Bazar do Renascer?

O **Bazar do Renascer** é o bazar beneficente de um centro espírita. Sua operação é simples em intenção e complexa em logística: a instituição recebe doações de roupas, calçados e acessórios, avalia e precifica cada peça, e a revende a valores simbólicos. O resultado financeiro é integralmente revertido para as ações assistenciais mantidas pela casa.

Historicamente, esse tipo de bazar funciona de forma presencial e episódica — alguns fins de semana por ano, dependendo de espaço físico e de voluntários disponíveis. A plataforma digital nasce para resolver três limitações desse modelo:

1. **Alcance restrito** ao público que consegue comparecer presencialmente;
2. **Descontinuidade**, com o acervo parado entre uma edição e outra;
3. **Ausência de registro**, dificultando prestar contas de quanto foi arrecadado e como.

A plataforma transforma o bazar em uma operação contínua, acessível de qualquer lugar e com histórico auditável de cada venda e cada doação.

### 2.2 Principais funcionalidades

A plataforma possui os seguintes módulos:

- vitrine pública de peças, acessível sem cadastro, com link compartilhável por peça;
- busca e filtros por categoria, tamanho, condição e faixa de preço;
- cadastro e autenticação de compradores;
- carrinho de compras e finalização de pedido (checkout);
- cadastro de endereço de entrega;
- módulo de doação financeira avulsa, independente de compra;
- painel administrativo com gestão do acervo (cadastro, edição e remoção de peças);
- upload de fotos das peças;
- histórico de vendas e de doações, com totalizadores por período;
- painel gerencial com indicadores de arrecadação mensal;
- funcionamento como aplicativo instalável no celular, com suporte offline.

### 2.3 Como o sistema funciona

Um exemplo simplificado do fluxo é:

1. A instituição recebe uma doação de roupas.
2. Um voluntário administrador fotografa a peça e a cadastra na plataforma, com categoria, tamanho, condição e preço.
3. A peça passa a aparecer na vitrine pública, visível para qualquer pessoa.
4. Um visitante navega pela vitrine, filtra por tamanho ou categoria e adiciona peças ao carrinho.
5. Para finalizar, o visitante cria uma conta e cadastra um endereço de entrega.
6. No checkout, o sistema reserva as peças de forma atômica, registra a venda e marca as peças como vendidas.
7. Alternativamente, qualquer pessoa cadastrada pode fazer uma doação financeira direta, sem comprar nada.
8. A administração acompanha, pelo painel, a arrecadação do mês e o histórico de vendas e doações.

Assim, uma falha tecnológica não afeta apenas a equipe técnica. Se a vitrine ficar indisponível, nenhuma peça é vendida naquele período; se o checkout falhar, uma pessoa disposta a contribuir desiste; se o cadastro de peças apresentar erro, o acervo doado fica parado em vez de circular.

### 2.4 Por que a dependência tecnológica é crítica aqui

Diferente de um comércio convencional, o bazar solidário **não tem canal alternativo de venda** enquanto a plataforma está fora do ar. Não há loja física aberta todos os dias, nem equipe comercial para contornar a falha. A plataforma é o canal.

Além disso, a operação é mantida por **voluntários**, não por uma equipe de TI dedicada. Isso impõe uma exigência adicional aos indicadores: eles precisam ser simples o bastante para serem acompanhados por pessoas sem formação técnica, e ligados a decisões claras.

---

## 3. Problema analisado

Com o início da operação digital, a coordenação do bazar percebeu a necessidade de acompanhar a qualidade técnica da plataforma de maneira quantitativa.

Relatos isolados como "o site estava fora do ar ontem" ou "uma pessoa não conseguiu comprar" não são suficientes para determinar a dimensão do problema, comparar períodos ou verificar se uma correção realmente produziu resultado. Pior: em uma operação pequena, falhas podem passar completamente despercebidas — ninguém reclama, a pessoa simplesmente desiste e não volta.

Dessa forma, o desafio consiste em responder perguntas como:

- A vitrine está no ar quando as pessoas procuram por ela?
- As páginas carregam rápido o suficiente para que ninguém desista antes de ver as peças?
- Quantas tentativas de compra falham por erro técnico?
- Quanto tempo a equipe leva para restabelecer o serviço após uma falha?
- As peças doadas estão conseguindo ser publicadas sem erro?
- **E quanto deixou de ser arrecadado por causa disso?**

Para responder a essas questões, foram estabelecidos objetivos estratégicos e indicadores mensuráveis.

---

## 4. Objetivos estratégicos de TI

Os objetivos estratégicos foram definidos considerando o impacto da tecnologia sobre a continuidade da arrecadação e sobre a capacidade de circular o acervo doado.

### OE1 - Aumentar a disponibilidade da vitrine

Elevar a disponibilidade mensal da plataforma para **pelo menos 99,5%**, reduzindo períodos em que nenhuma venda pode ocorrer.

### OE2 - Melhorar o desempenho das operações críticas

Manter o tempo médio de resposta das principais operações em **até 1,5 segundo**, reduzindo a desistência por lentidão.

### OE3 - Aumentar a confiabilidade do checkout

Reduzir a taxa de falhas técnicas na finalização de compras para **menos de 1%**.

### OE4 - Acelerar a recuperação após incidentes

Manter o tempo médio de reparo de incidentes que provoquem indisponibilidade em **até 30 minutos**.

### OE5 - Aumentar a confiabilidade da publicação de peças

Garantir que **pelo menos 98%** das tentativas de cadastro de peça sejam concluídas com sucesso, evitando que o acervo doado fique parado por falha técnica.

---

## 5. Objetivos de melhoria

A partir dos objetivos estratégicos, são propostas as seguintes melhorias:

- implantar monitoramento automatizado de disponibilidade da vitrine;
- identificar as operações e os horários com maior lentidão;
- registrar e classificar os erros técnicos ocorridos no checkout;
- padronizar o registro de início e encerramento dos incidentes;
- implementar alertas para falhas críticas, já que não há equipe de plantão;
- acompanhar o resultado de cada tentativa de cadastro de peça;
- utilizar o histórico de indicadores para avaliar tendências;
- realizar comparações antes e depois de cada intervenção técnica;
- traduzir os indicadores técnicos em impacto de arrecadação, tornando-os compreensíveis para a coordenação não técnica.

---

## 6. Relação entre objetivos e indicadores

| Objetivo estratégico | Objetivo de melhoria | Indicador |
|---|---|---|
| Aumentar a disponibilidade da vitrine | Reduzir interrupções | Disponibilidade da Plataforma |
| Melhorar o desempenho | Reduzir lentidão e desistência | Tempo Médio de Resposta |
| Aumentar confiabilidade do checkout | Reduzir erros na finalização | Taxa de Falhas de Checkout |
| Acelerar recuperação | Melhorar resposta a incidentes | MTTR - Tempo Médio de Reparo |
| Aumentar confiabilidade da publicação | Reduzir falhas no cadastro de peças | Taxa de Sucesso na Publicação de Peças |

---

# 7. Especificação dos indicadores

As fichas abaixo seguem os campos solicitados no modelo da atividade: nome, definição, objetivo relacionado, fórmula, exemplo, periodicidade, unidade, origem, responsável, meta, regras de negócio, procedimento de coleta e interpretação.

---

## 7.1 Indicador 1 - Disponibilidade da Plataforma

### Nome
**Disponibilidade da Plataforma**

### Definição do indicador
Percentual do período monitorado em que a vitrine do Bazar do Renascer permaneceu acessível e operacional para visitantes e compradores.

### Objetivo relacionado
OE1 - Aumentar a disponibilidade da vitrine.

### Fórmula

**Disponibilidade (%) = ((Tempo total monitorado − Tempo de indisponibilidade não planejada) / Tempo total monitorado) × 100**

### Exemplo
Em um mês de 30 dias (43.200 minutos), ocorreram 82 minutos de indisponibilidade não planejada:

Disponibilidade = ((43.200 − 82) / 43.200) × 100

Disponibilidade = **99,81%**

### Periodicidade
Mensal, com monitoramento automatizado contínuo.

### Unidade
Percentual (%).

### Origem
Serviço externo de monitoramento (verificação periódica da vitrine), logs da aplicação e registros de incidentes.

### Responsável
Voluntário responsável pela manutenção técnica da plataforma.

### Meta
**≥ 99,5% ao mês** (equivalente a no máximo 3h36 de indisponibilidade mensal).

### Regras de negócio
- considerar indisponibilidade quando a vitrine pública estiver inacessível para um visitante não autenticado;
- considerar somente interrupções não planejadas no indicador principal;
- manutenções programadas e previamente comunicadas devem ser registradas separadamente;
- falha restrita ao painel administrativo é registrada como indisponibilidade parcial e não entra no indicador principal, pois não impede vendas;
- utilizar a mesma janela mensal para comparação histórica.

### Procedimento de coleta
1. O serviço de monitoramento verifica a vitrine a cada 5 minutos.
2. Duas falhas consecutivas abrem um evento de indisponibilidade.
3. O horário de início e o de recuperação são registrados automaticamente.
4. Ao final do mês, soma-se o tempo de indisponibilidade não planejada.
5. O valor é aplicado à fórmula.
6. O resultado é armazenado no painel mensal.

### Interpretação
Quanto maior o resultado, melhor. Como a plataforma é o único canal de venda, cada ponto percentual de indisponibilidade equivale a aproximadamente **7,2 horas por mês** sem qualquer possibilidade de arrecadação. Valores abaixo da meta indicam necessidade de investigar infraestrutura, banco de dados ou hospedagem.

---

## 7.2 Indicador 2 - Tempo Médio de Resposta

### Nome
**Tempo Médio de Resposta das Operações Críticas**

### Definição do indicador
Tempo médio necessário para o sistema responder às operações consideradas críticas: carregamento da vitrine, busca de peças, abertura do detalhe de uma peça, adição ao carrinho e finalização da compra.

### Objetivo relacionado
OE2 - Melhorar o desempenho das operações críticas.

### Fórmula

**TMR = Soma dos tempos de resposta das requisições / Número total de requisições monitoradas**

### Exemplo
Se 24.500 requisições totalizaram 29.890 segundos de processamento:

TMR = 29.890 / 24.500

TMR = **1,22 segundo**

### Periodicidade
Acompanhamento diário e consolidação mensal.

### Unidade
Segundos (s).

### Origem
Logs de desempenho da aplicação, métricas do backend e medições de carregamento no navegador.

### Responsável
Voluntário responsável pelo desenvolvimento da plataforma.

### Meta
**≤ 1,5 s.**

### Regras de negócio
- utilizar apenas as operações previamente definidas como críticas;
- requisições que falharam por erro de digitação ou entrada inválida do usuário não são contabilizadas como lentidão do sistema;
- o tempo de download das fotos hospedadas em serviço externo é medido separadamente, para não mascarar o desempenho da aplicação;
- manter os mesmos critérios de medição entre os períodos comparados;
- valores extremos ocorridos durante incidentes conhecidos devem ser analisados à parte.

### Procedimento de coleta
1. Registrar o horário de início da requisição.
2. Registrar o horário de conclusão.
3. Calcular o tempo de resposta.
4. Armazenar o valor em log.
5. Consolidar os registros do período.
6. Calcular a média das requisições elegíveis.

### Interpretação
Valores menores representam melhor desempenho. Em uma vitrine de comércio, lentidão não gera reclamação — gera abandono silencioso. Um aumento contínuo pode indicar consultas ineficientes ao banco, imagens pesadas demais ou sobrecarga de infraestrutura.

---

## 7.3 Indicador 3 - Taxa de Falhas de Checkout

### Nome
**Taxa de Falhas Técnicas de Checkout**

### Definição do indicador
Percentual de tentativas válidas de finalização de compra que não foram concluídas devido a erro técnico da plataforma.

### Objetivo relacionado
OE3 - Aumentar a confiabilidade do checkout.

### Fórmula

**Taxa de Falhas (%) = (Checkouts com falha técnica / Total de tentativas válidas de checkout) × 100**

### Exemplo
Em 730 tentativas válidas, 4 apresentaram erro técnico:

Taxa de Falhas = (4 / 730) × 100

Taxa de Falhas = **0,55%**

### Periodicidade
Semanal, com consolidação mensal.

### Unidade
Percentual (%).

### Origem
Logs do procedimento de checkout no banco de dados e registros de erro da aplicação.

### Responsável
Voluntário responsável pelo desenvolvimento da plataforma.

### Meta
**< 1%.**

### Regras de negócio
- considerar apenas falhas causadas pelo sistema ou por suas integrações;
- não contabilizar desistência voluntária do comprador;
- **não classificar como falha técnica a recusa legítima de compra** quando a peça já foi vendida a outra pessoa e o sistema informa isso corretamente — trata-se do comportamento esperado, já que cada peça é única;
- não contabilizar a recusa por ausência de endereço de entrega cadastrado, que também é validação esperada;
- evitar contagem duplicada do mesmo evento técnico;
- registrar o tipo de erro para análise posterior.

### Procedimento de coleta
1. Registrar cada tentativa válida de checkout.
2. Identificar o status final da operação.
3. Classificar se a falha foi técnica ou regra de negócio.
4. Somar apenas as falhas técnicas no período.
5. Dividir pelo total de tentativas válidas.
6. Multiplicar o resultado por 100.

### Interpretação
Quanto menor o resultado, melhor. Este é o indicador de maior impacto financeiro direto: uma falha aqui ocorre no momento exato em que a pessoa já decidiu contribuir. Uma elevação pode indicar regressão após atualização, concorrência mal tratada entre compradores simultâneos ou falha de integração.

---

## 7.4 Indicador 4 - MTTR

### Nome
**MTTR - Tempo Médio de Reparo**

### Definição do indicador
Tempo médio necessário para restaurar o funcionamento normal da plataforma após incidentes que provoquem indisponibilidade relevante.

### Objetivo relacionado
OE4 - Acelerar a recuperação após incidentes.

### Fórmula

**MTTR = Soma do tempo de recuperação dos incidentes / Número de incidentes considerados**

### Exemplo
Três incidentes tiveram tempos de recuperação de 15, 22 e 26 minutos:

MTTR = (15 + 22 + 26) / 3

MTTR = **21 minutos**

### Periodicidade
Mensal, com registro individual por incidente.

### Unidade
Minutos.

### Origem
Registro de incidentes e histórico do serviço de monitoramento.

### Responsável
Voluntário responsável pela manutenção técnica, com apoio de terceiros quando necessário.

### Meta
**≤ 30 minutos.**

### Regras de negócio
- considerar apenas incidentes que causem indisponibilidade relevante da vitrine;
- registrar o horário de detecção e o de restauração;
- utilizar critérios consistentes de início e fim entre os períodos;
- manutenções planejadas não entram no cálculo;
- incidentes decorrentes do mesmo evento-raiz devem ser avaliados para evitar duplicidade;
- o tempo começa a contar na **detecção**, não no relato — por isso o alerta automático é pré-requisito do indicador.

### Procedimento de coleta
1. Registrar o momento em que o incidente é detectado pelo monitoramento.
2. Abrir o registro do incidente.
3. Registrar o horário de restauração do serviço.
4. Calcular a duração.
5. Ao final do período, somar os tempos.
6. Dividir pelo número de incidentes elegíveis.

### Interpretação
Quanto menor o MTTR, maior a capacidade de recuperação. Este indicador é especialmente sensível no contexto do bazar: como a manutenção é feita por voluntários, sem plantão, o MTTR mede na prática **quanto tempo leva até alguém perceber e agir**. Um MTTR alto costuma indicar ausência de alerta automático, e não falta de competência técnica.

---

## 7.5 Indicador 5 - Taxa de Sucesso na Publicação de Peças

### Nome
**Taxa de Sucesso na Publicação de Peças**

### Definição do indicador
Percentual de tentativas de cadastro de peça — incluindo o envio da foto — concluídas com sucesso e publicadas na vitrine.

### Objetivo relacionado
OE5 - Aumentar a confiabilidade da publicação de peças.

### Fórmula

**Taxa de Sucesso (%) = (Peças publicadas com sucesso / Total de tentativas de publicação) × 100**

### Exemplo
De 740 tentativas de publicação, 732 foram concluídas com sucesso:

Taxa de Sucesso = (732 / 740) × 100

Taxa de Sucesso = **98,9%**

### Periodicidade
Semanal, com consolidação mensal.

### Unidade
Percentual (%).

### Origem
Logs de upload de imagens e registros de inserção no catálogo.

### Responsável
Voluntário responsável pelo desenvolvimento, com retorno dos voluntários que operam o cadastro.

### Meta
**≥ 98%.**

### Regras de negócio
- contabilizar a tentativa a partir do momento em que o formulário é enviado;
- considerar falha tanto o erro no envio da foto quanto o erro na gravação dos dados;
- cancelamento voluntário antes do envio não é contabilizado;
- nova tentativa do mesmo cadastro após falha é contabilizada como evento distinto;
- separar falha de validação (arquivo em formato não suportado) de falha de infraestrutura, pois exigem ações diferentes;
- registrar o tipo de erro para análise posterior.

### Procedimento de coleta
1. Registrar cada envio do formulário de cadastro de peça.
2. Registrar o resultado do upload da imagem.
3. Registrar o resultado da gravação no catálogo.
4. Classificar o resultado final como sucesso ou falha.
5. Consolidar os resultados do período.
6. Dividir os sucessos pelo total de tentativas e multiplicar por 100.

### Interpretação
Quanto maior o percentual, melhor. Este indicador tem efeito duplo: cada falha representa uma peça doada que **não chega à vitrine**, e representa também um voluntário frustrado com a ferramenta. Em operações mantidas por voluntariado, a fricção na ferramenta é um fator real de abandono — o custo não é só a peça não publicada.

---

# 8. Cenário quantitativo simulado

Para demonstrar a utilização dos indicadores, foi construído um cenário de seis meses, de janeiro a junho.

## 8.1 Base simulada

| Mês | Disponibilidade (%) | TMR (s) | Falhas de checkout (%) | MTTR (min) | Sucesso na publicação (%) |
|---|---:|---:|---:|---:|---:|
| Janeiro | 98,62 | 2,45 | 3,20 | 58 | 91,8 |
| Fevereiro | 98,90 | 2,18 | 2,60 | 50 | 93,4 |
| Março | 99,18 | 1,86 | 1,90 | 42 | 95,1 |
| Abril | 99,41 | 1,58 | 1,30 | 34 | 96,8 |
| Maio | 99,63 | 1,37 | 0,85 | 27 | 98,1 |
| Junho | 99,81 | 1,22 | 0,55 | 21 | 98,9 |

### Metas
- Disponibilidade: ≥ 99,5%
- TMR: ≤ 1,5 s
- Falhas de checkout: < 1%
- MTTR: ≤ 30 min
- Sucesso na publicação: ≥ 98%

## 8.2 Volume de operação simulado

Para dar escala aos percentuais, o cenário considera o seguinte volume mensal em junho:

| Grandeza | Valor |
|---|---:|
| Peças disponíveis no acervo | 410 |
| Tentativas de checkout | 730 |
| Tentativas de publicação de peças | 740 |
| Ticket médio por peça | R$ 38,00 |
| Doações financeiras avulsas | 95 |

---

# 9. Interpretação dos dados simulados

Os dados simulados representam uma situação em que a plataforma inicia o período abaixo de todas as metas e melhora progressivamente ao longo do semestre.

### Disponibilidade
A disponibilidade aumenta de **98,62% para 99,81%**, ultrapassando a meta a partir de maio.

**Variação:** +1,19 ponto percentual.

Traduzindo em tempo: a plataforma passa de aproximadamente **9,9 horas fora do ar por mês** para cerca de **1,4 hora** — uma redução de 8,6 horas mensais em que nenhuma venda era possível.

### Tempo médio de resposta
O TMR diminui de **2,45 s para 1,22 s**.

Redução relativa:

**((2,45 − 1,22) / 2,45) × 100 = 50,2%**

A meta passa a ser cumprida em abril.

### Falhas de checkout
A taxa cai de **3,20% para 0,55%**.

Redução relativa:

**((3,20 − 0,55) / 3,20) × 100 = 82,8%**

Em volume: de aproximadamente 23 compras perdidas por erro técnico em janeiro para 4 em junho.

### MTTR
O MTTR cai de **58 para 21 minutos**.

Redução relativa:

**((58 − 21) / 58) × 100 = 63,8%**

### Publicação de peças
A taxa de sucesso cresce de **91,8% para 98,9%**, cumprindo a meta a partir de maio.

**Variação:** +7,1 pontos percentuais. Em janeiro, aproximadamente 1 em cada 12 peças doadas não conseguia ser publicada por falha técnica.

### 9.1 Tradução em impacto social

Esta é a leitura que interessa à coordenação do bazar. Considerando o ticket médio de R$ 38,00 e a concentração de acessos em 12 horas úteis por dia:

| Efeito | Janeiro | Junho | Ganho mensal estimado |
|---|---:|---:|---:|
| Horas sem possibilidade de venda | 9,9 h | 1,4 h | +8,6 h de operação |
| Compras perdidas por erro de checkout | ~23 | ~4 | ~19 compras recuperadas |
| Peças doadas não publicadas | ~61 | ~8 | ~53 peças a mais circulando |

Somando apenas as compras recuperadas no checkout, o ganho estimado fica em torno de **R$ 720,00 por mês** destinados às ações assistenciais — valor que antes se perdia silenciosamente em erro técnico.

> **Observação:** estes valores derivam do cenário simulado e servem para demonstrar o método de tradução entre indicador técnico e impacto social, não para afirmar resultado real.

---

# 10. Teste comparativo - antes e depois

Para tornar a avaliação mais objetiva, janeiro é utilizado como cenário inicial e junho como cenário posterior às melhorias.

| Indicador | Janeiro | Junho | Meta | Situação final |
|---|---:|---:|---:|---|
| Disponibilidade | 98,62% | 99,81% | ≥ 99,5% | Meta atingida |
| TMR | 2,45 s | 1,22 s | ≤ 1,5 s | Meta atingida |
| Falhas de checkout | 3,20% | 0,55% | < 1% | Meta atingida |
| MTTR | 58 min | 21 min | ≤ 30 min | Meta atingida |
| Sucesso na publicação | 91,8% | 98,9% | ≥ 98% | Meta atingida |

Os cinco indicadores apresentam evolução favorável e terminam o período dentro da meta. No cenário simulado, isso permite demonstrar que as intervenções técnicas produziram impacto mensurável — e não apenas a sensação de que "melhorou".

---

# 11. Melhorias técnicas simuladas

Para que os dados não apareçam como números sem explicação, o cenário considera as seguintes intervenções, organizadas em três fases:

### Janeiro/Fevereiro - Diagnóstico
- implantação de monitoramento automatizado da vitrine, com verificação a cada 5 minutos;
- configuração de alerta por mensagem para o voluntário responsável, eliminando a dependência de alguém "perceber" a falha;
- instrumentação das operações críticas para medir tempo de resposta;
- classificação dos erros ocorridos no checkout e no cadastro de peças;
- padronização do registro de incidentes.

### Março/Abril - Intervenções
- otimização das consultas ao banco de dados da vitrine;
- **correção de uma falha no checkout que mantinha a requisição pendurada** quando a peça já havia sido vendida, em vez de responder imediatamente com a mensagem adequada;
- implementação de reserva atômica de peças, garantindo que duas pessoas comprando simultaneamente não gerem venda duplicada;
- **redimensionamento automático das fotos no momento do upload**, reduzindo tanto o tempo de publicação quanto o peso da vitrine;
- adoção de cache local (service worker), permitindo que a vitrine abra mesmo com conexão instável;
- revisão das mensagens de erro, para que o voluntário entenda o que fazer quando algo falha.

### Maio/Junho - Estabilização
- acompanhamento das novas versões publicadas;
- análise recorrente dos indicadores em reunião mensal da coordenação;
- ajustes adicionais de desempenho;
- documentação do procedimento de recuperação, para que não dependa de uma única pessoa;
- acompanhamento das falhas residuais.

Essa estrutura cria uma relação de **problema → intervenção → medição → resultado**, tornando os indicadores instrumentos de gestão e não apenas números isolados.

### 11.1 Destaque: a falha que travava o checkout

Vale detalhar uma das intervenções, por ilustrar bem a utilidade dos indicadores.

Em janeiro, a taxa de falhas de checkout estava em 3,20% — muito acima da meta. A investigação, motivada pelo indicador, revelou que quando uma pessoa tentava comprar uma peça já vendida, a requisição **não respondia**: ficava pendurada até o tempo limite do navegador. Do ponto de vista de quem comprava, o site havia travado.

A causa era o código de erro usado internamente para sinalizar "peça indisponível", interpretado pela camada de dados como uma falha temporária passível de nova tentativa automática. Como a condição era permanente, as tentativas se repetiam indefinidamente.

A correção foi pontual — trocar o código de erro — mas só foi encontrada porque o indicador apontou um número fora do esperado. **Sem a medição, o sintoma seria invisível:** ninguém reclama de um site que "não responde", apenas fecha a aba.

---

# 12. Gráficos recomendados

Os gráficos a seguir podem compor o documento e, principalmente, a apresentação.

### Gráfico 1 - Evolução da disponibilidade
- eixo X: janeiro a junho;
- eixo Y: disponibilidade (%), com escala iniciando em 98% para tornar a variação visível;
- linha dos resultados;
- linha horizontal tracejada marcando a meta de 99,5%.

### Gráfico 2 - Evolução do tempo médio de resposta
Linha decrescente de 2,45 s para 1,22 s, com linha de meta em 1,5 s. Destacar o ponto de cruzamento em abril.

### Gráfico 3 - Falhas de checkout
Barras mensais caindo de 3,20% para 0,55%, com linha de meta em 1%.

### Gráfico 4 - MTTR
Barras mensais caindo de 58 para 21 minutos, com linha de meta em 30 minutos.

### Gráfico 5 - Taxa de sucesso na publicação de peças
Linha crescente de 91,8% para 98,9%, com linha de meta em 98%.

### Gráfico 6 - Painel de metas de junho
Cinco cartões ou barras, cada um indicando resultado, meta e situação:

- Disponibilidade: **99,81%** — Meta atingida
- TMR: **1,22 s** — Meta atingida
- Falhas de checkout: **0,55%** — Meta atingida
- MTTR: **21 min** — Meta atingida
- Publicação de peças: **98,9%** — Meta atingida

### Gráfico 7 - Impacto social acumulado
Gráfico de barras comparando janeiro e junho em três grandezas de negócio: horas sem venda possível, compras perdidas por erro técnico e peças doadas não publicadas. É o gráfico que conecta TI à missão da instituição.

---

# 13. Proposta de dashboard

Um painel da plataforma pode ser apresentado como protótipo ou captura de tela.

## Visão executiva - Junho

| Indicador | Resultado | Meta | Situação |
|---|---:|---:|---|
| Disponibilidade | 99,81% | ≥ 99,5% | Meta atingida |
| Tempo médio de resposta | 1,22 s | ≤ 1,5 s | Meta atingida |
| Falhas de checkout | 0,55% | < 1% | Meta atingida |
| MTTR | 21 min | ≤ 30 min | Meta atingida |
| Sucesso na publicação | 98,9% | ≥ 98% | Meta atingida |

### Painel de impacto - Junho

| Grandeza | Valor |
|---|---:|
| Arrecadação com vendas | R$ 27.588,00 |
| Doações financeiras avulsas | 95 |
| Peças publicadas no mês | 732 |
| Horas sem possibilidade de venda | 1,4 h |

O painel deve permitir que a coordenação identifique rapidamente quais indicadores estão dentro ou fora da meta, usando cor e texto — nunca cor isoladamente, para que a leitura não dependa de percepção cromática.

---

# 14. Critérios para tomada de decisão

Os indicadores devem gerar ações. Cada situação abaixo tem uma decisão associada e um responsável.

| Situação | Decisão sugerida |
|---|---|
| Disponibilidade < 99,5% | Analisar os incidentes do período e identificar o componente responsável |
| TMR > 1,5 s | Identificar as operações mais lentas e revisar consultas e peso das imagens |
| Falhas de checkout ≥ 1% | Prioridade máxima: investigar imediatamente, pois afeta a arrecadação direta |
| MTTR > 30 min | Revisar o processo de alerta e a documentação de recuperação |
| Sucesso na publicação < 98% | Investigar o upload de imagens e dar retorno aos voluntários do cadastro |
| Dois indicadores fora da meta no mesmo mês | Levar o tema à reunião de coordenação e avaliar necessidade de apoio externo |

Dessa forma, cada indicador possui vínculo direto com uma decisão operacional, e não apenas com um relatório.

---

# 15. Limitações da simulação

Os resultados de operação não representam dados coletados ao longo de seis meses reais. A plataforma existe e funciona, mas ainda não acumulou esse histórico; a base foi criada para demonstrar a aplicação dos indicadores.

Por isso:

- os números não devem ser apresentados como evidência de desempenho histórico real;
- a relação entre cada melhoria e o resultado do mês representa um cenário hipotético, ainda que as intervenções descritas correspondam a melhorias efetivamente implementadas na plataforma;
- em uma implantação completa, as metas precisariam ser validadas com histórico operacional próprio, e não apenas com referências de mercado;
- a evolução linear e consistente dos seis meses é uma simplificação didática: operações reais apresentam oscilação, sazonalidade e regressões pontuais;
- os indicadores poderiam ser complementados por percentis (p95 em vez de média no tempo de resposta), segmentação por dispositivo e classificação de severidade dos incidentes;
- o indicador de disponibilidade, medido a cada 5 minutos, não captura interrupções mais curtas que esse intervalo.

Essa limitação não impede o uso acadêmico da simulação, desde que sua natureza fictícia seja explicitada — como está, nesta seção e na nota de abertura.

---

# 16. Síntese estratégica

A proposta pode ser resumida na seguinte cadeia:

**Necessidade do negócio**
↓
A instituição depende da plataforma para transformar doações em recursos assistenciais.

**Objetivos estratégicos de TI**
↓
Disponibilidade, desempenho, confiabilidade do checkout, recuperação e publicação do acervo.

**Indicadores**
↓
Disponibilidade + TMR + Falhas de Checkout + MTTR + Sucesso na Publicação.

**Dados**
↓
Monitoramento automatizado, logs da aplicação, registros do banco e histórico de incidentes.

**Análise**
↓
Comparação com metas, com o histórico e com o impacto estimado na arrecadação.

**Decisão**
↓
Priorização das melhorias técnicas com maior retorno social.

**Resultado esperado**
↓
Mais peças circulando, mais vendas concluídas e mais recursos chegando às ações assistenciais.

---

# 17. Conclusão

A definição de indicadores estratégicos permite transformar o funcionamento técnico de um sistema em informações mensuráveis e úteis para a gestão.

No caso do Bazar do Renascer, os cinco indicadores selecionados avaliam dimensões complementares da plataforma: disponibilidade, velocidade, confiabilidade da compra, capacidade de recuperação e confiabilidade da publicação do acervo.

A utilização de metas possibilita identificar objetivamente quando um resultado é satisfatório. A análise histórica, por sua vez, permite observar tendências e verificar se as intervenções técnicas estão associadas à melhoria do desempenho. A simulação de seis meses demonstra como isso funciona na prática: em vez de afirmar subjetivamente que "o sistema melhorou", é possível demonstrar a redução de 50,2% no tempo de resposta, de 82,8% nas falhas de checkout e de 63,8% no MTTR.

Há, porém, um elemento que distingue este caso. Em uma empresa, o indicador de TI conecta-se a receita. Aqui, ele se conecta a **missão**. Cada hora a mais no ar é uma hora em que alguém pode comprar uma peça cujo valor será revertido em assistência; cada falha de checkout evitada é uma contribuição que efetivamente chega ao destino. Traduzir indicadores técnicos nessa linguagem não é apenas um recurso de comunicação — é o que permite que uma coordenação formada por voluntários, sem formação em tecnologia, participe das decisões técnicas de forma informada.

Dessa forma, o Bazar do Renascer exemplifica como indicadores de TI podem conectar objetivos tecnológicos às necessidades do negócio e, neste caso, ao propósito social da instituição — apoiando decisões e sustentando um processo contínuo de melhoria.

---

# 18. Estrutura da apresentação (até 15 minutos)

Roteiro com tempo estimado por slide, conteúdo e orientação de fala.

**Total: 14 minutos e 30 segundos**, deixando 30 segundos de margem dentro do limite de 15 minutos. Os slides 8 e 13 recebem mais tempo por concentrarem o argumento central do trabalho.

---

## Slide 1 - Capa
**(30 segundos)**

**Bazar do Renascer**
Indicadores Estratégicos de TI

Logo do bazar, nome dos integrantes, matrículas, disciplina e data.

> *Fala:* "Vamos apresentar a definição de indicadores estratégicos de TI para a plataforma do Bazar do Renascer, o bazar beneficente de um centro espírita."

---

## Slide 2 - O que é o Bazar do Renascer?
**(1 minuto)**

- Bazar beneficente de um centro espírita
- Recebe doações de roupas, revende a valores simbólicos
- Resultado integralmente revertido para ações assistenciais
- A plataforma transforma um bazar episódico e presencial em operação contínua e online

> *Fala:* destacar que a plataforma resolve três limitações do modelo presencial: alcance restrito, descontinuidade entre edições e ausência de registro.

---

## Slide 3 - Por que TI é crítica aqui?
**(1 minuto)**

Dois pontos que diferenciam este caso:

1. **Não há canal alternativo.** Fora do ar significa zero venda — não existe loja física aberta todo dia.
2. **A operação é voluntária.** Não há equipe de TI de plantão, o que torna a detecção automática de falhas um requisito, não um luxo.

> *Fala:* "Em uma loja comum, o site cair é perda de receita. Aqui, é a arrecadação que financia as ações sociais que para."

---

## Slide 4 - Objetivos estratégicos de TI
**(1 minuto)**

| | Objetivo | Meta |
|---|---|---|
| OE1 | Aumentar a disponibilidade | ≥ 99,5% |
| OE2 | Melhorar o desempenho | ≤ 1,5 s |
| OE3 | Confiabilidade do checkout | < 1% de falhas |
| OE4 | Acelerar a recuperação | MTTR ≤ 30 min |
| OE5 | Confiabilidade da publicação | ≥ 98% |

---

## Slide 5 - Os cinco indicadores
**(30 segundos)**

Mostrar a cadeia **Objetivo → Indicador → Meta** em uma única tabela, para dar a visão completa antes de detalhar cada um.

> *Fala:* anunciar que cada indicador será detalhado com definição, fórmula, meta e gráfico.

---

## Slide 6 - Disponibilidade da Plataforma
**(1 minuto)**

- **Fórmula:** ((Tempo monitorado − Indisponibilidade) / Tempo monitorado) × 100
- **Meta:** ≥ 99,5%
- **Resultado:** 98,62% → 99,81%
- Gráfico 1

> *Fala:* "99,5% parece pouco exigente, mas 0,5% equivale a 3h36 por mês sem nenhuma venda possível."

---

## Slide 7 - Tempo Médio de Resposta
**(1 minuto)**

- **Fórmula:** Soma dos tempos / Número de requisições
- **Meta:** ≤ 1,5 s
- **Resultado:** 2,45 s → 1,22 s (redução de 50,2%)
- Gráfico 2

> *Fala:* "Lentidão não gera reclamação. Gera abandono silencioso."

---

## Slide 8 - Taxa de Falhas de Checkout
**(1 minuto 30)**

- **Fórmula:** (Falhas técnicas / Tentativas válidas) × 100
- **Meta:** < 1%
- **Resultado:** 3,20% → 0,55% (redução de 82,8%)
- Gráfico 3

> *Fala:* destacar a regra de negócio — peça já vendida **não** conta como falha técnica, porque cada peça é única e a recusa é o comportamento correto. É o indicador de maior impacto financeiro: a falha acontece quando a pessoa já decidiu contribuir.

---

## Slide 9 - MTTR
**(1 minuto)**

- **Fórmula:** Soma dos tempos de recuperação / Número de incidentes
- **Meta:** ≤ 30 min
- **Resultado:** 58 min → 21 min (redução de 63,8%)
- Gráfico 4

> *Fala:* "Sem equipe de plantão, o MTTR mede principalmente quanto tempo leva até alguém **perceber** a falha. Por isso a maior parte do ganho veio do alerta automático."

---

## Slide 10 - Sucesso na Publicação de Peças
**(1 minuto)**

- **Fórmula:** (Peças publicadas / Tentativas de publicação) × 100
- **Meta:** ≥ 98%
- **Resultado:** 91,8% → 98,9%
- Gráfico 5

> *Fala:* "Cada falha é uma peça doada que não chega à vitrine — e um voluntário frustrado com a ferramenta."

---

## Slide 11 - Dados simulados
**(1 minuto)**

Tabela completa dos seis meses.

> *Fala, obrigatória:* "Os dados de operação são simulados. A plataforma é real e está funcionando, mas ainda não acumulou seis meses de histórico. Construímos esta série para demonstrar como os indicadores seriam calculados e utilizados."

---

## Slide 12 - Antes × Depois
**(30 segundos)**

Tabela comparativa janeiro × junho, com a coluna de situação final. Os cinco indicadores terminam dentro da meta.

---

## Slide 13 - O caso da falha invisível
**(1 minuto 30)**

O slide que mais convence. Contar a história:

1. O indicador apontou 3,20% de falhas no checkout
2. A investigação revelou: comprar peça já vendida **travava** a página
3. Causa: código de erro interno tratado como falha temporária, gerando repetição infinita
4. Correção pontual, resultado medido

> *Fala:* "Ninguém reclama de um site que não responde — apenas fecha a aba. Sem o indicador, esse problema seria invisível."

---

## Slide 14 - Impacto social
**(1 minuto)**

| Efeito | Janeiro | Junho |
|---|---:|---:|
| Horas sem venda possível | 9,9 h | 1,4 h |
| Compras perdidas por erro | ~23 | ~4 |
| Peças não publicadas | ~61 | ~8 |

Estimativa: cerca de **R$ 720,00 por mês** recuperados para as ações assistenciais.

> *Fala:* "É assim que se explica TI para uma coordenação que não é técnica."

---

## Slide 15 - Conclusão
**(1 minuto)**

Reforçar a cadeia:

**Objetivo → Indicador → Medição → Análise → Melhoria**

E o fechamento:

> "Em uma empresa, o indicador de TI se conecta a receita. Aqui, se conecta a missão."

Encerrar agradecendo e abrindo para perguntas.

---

# 19. Observação para a apresentação oral

Ao apresentar os dados, a equipe deve deixar explícito, preferencialmente no slide 11:

> "O Bazar do Renascer é uma plataforma real, desenvolvida e em funcionamento. Porém, como ainda não acumulou seis meses de operação, os dados quantitativos desta análise foram simulados exclusivamente para fins acadêmicos. Construímos uma evolução de seis meses para demonstrar como os indicadores seriam calculados, acompanhados e utilizados na tomada de decisão."

Isso evita qualquer interpretação de que os resultados sejam provenientes de medições reais, ao mesmo tempo em que preserva o mérito de o sistema efetivamente existir.

### Perguntas prováveis da banca

| Pergunta | Resposta sugerida |
|---|---|
| "Por que só cinco indicadores?" | Indicadores demais diluem a atenção. Cinco cobrem as dimensões críticas e cabem em um painel que a coordenação consegue acompanhar mensalmente. |
| "Por que média e não percentil no tempo de resposta?" | A média foi escolhida pela simplicidade de cálculo e comunicação. A seção de limitações reconhece que o p95 seria mais adequado para captar a experiência dos casos piores. |
| "A meta de 99,5% é adequada?" | É uma referência de mercado para sistemas não críticos. A seção de limitações registra que, em implantação completa, a meta deveria ser validada com histórico próprio. |
| "Como garantem que o dado coletado é confiável?" | Cada ficha de indicador traz regras de negócio e procedimento de coleta padronizados, justamente para que a medição seja reproduzível entre períodos. |

---

# 20. Checklist de aderência à atividade

- [x] Organização contextualizada.
- [x] Negócio e funcionamento explicados.
- [x] Objetivos estratégicos de TI definidos.
- [x] Objetivos de melhoria identificados.
- [x] Cinco indicadores estratégicos definidos.
- [x] Fórmula de cada indicador.
- [x] Exemplo de cálculo de cada indicador.
- [x] Periodicidade de cada indicador.
- [x] Unidade de medida.
- [x] Origem dos dados.
- [x] Responsável.
- [x] Regras de negócio.
- [x] Procedimento de coleta.
- [x] Metas quantitativas.
- [x] Dados simulados de seis meses.
- [x] Comparação antes e depois.
- [x] Sugestões de gráficos.
- [x] Proposta de dashboard.
- [x] Interpretação dos resultados.
- [x] Relação dos indicadores com decisões.
- [x] Transparência sobre a natureza fictícia dos dados.
- [x] Estrutura preparada para apresentação de até 15 minutos.
