# 모듈 3: Amazon DynamoDB로 데이터 계층 추가

![Architecture](../images/module-3/architecture-module-3.png)

**완료에 필요한 시간:** 20분

---
**시간이 부족한 경우:** `module-3/cdk`에 있는 완전한 레퍼런스 AWS CDK 코드를 참고하세요

---

**사용된 서비스:**

* [Amazon DynamoDB](https://aws.amazon.com/dynamodb/)

### 개요

이제 배포된 서비스와 작동하는 CI/CD 파이프라인을 통해 코드 리포지토리에 변경사항이 발생할 때 마다 서비스에 자동으로 배포되어 새로운 애플리케이션 기능을 구상에서부터 투두리스트 사용자가 사용할 수 있도록 신속하게 이동할 수 있습니다. 향상된 민첩성과 함께 투두리스트 웹사이트 아키텍처에 데이터 계층인 또 다른 기본 기능을 추가해보겠습니다. 이 모듈에서는 AWS의 매우 빠른 성능을 제공하며 관리되고 확장 가능한 NoSQL 데이터베이스 서비스인 [Amazon DynamoDB](https://aws.amazon.com/dynamodb/)에 테이블을 추가할 것입니다. 모든 투두를 정적 JSON 파일에 저장하지 않고, 웹사이트의 기능을 쉽게 추가하고 확장될 수 있도록 데이터베이스에 저장합니다.

### 투두리스트에 NoSQL 데이터베이스 추가

#### DynamoDB 테이블 생성

DynamoDB 테이블을 아키텍처에 추가하기 위해 AWS CDK를 사용하여 **TodoTable**이라 이름의 테이블을 정의하는 새로운 CloudFormation 스택을 작성하겠습니다. 이 테이블에는 **id**라는 해시 키 속성으로 정의된 인덱스가 있습니다. 투두리스트는 간단한 구조로 복잡한 보조 인덱스가 필요하지 않습니다.

`lib` 폴더에 `dynamodb-stack.ts`이라는 파일을 생성합니다:

새로운 터미널을 열어서 다음 명령어를 실행합니다.

```sh
cd cdk
touch lib/dynamodb-stack.ts
```

방금 생성한 파일에 이전에 했던 것 처럼 스켈레톤 CDK 스택 구조를 정의합니다. 이번에는 클래스명을 `DynamoDbStack`이라고 지정합니다:

```typescript
import * as cdk from 'aws-cdk-lib';

export class DynamoDbStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);
  }
}
```

그런 후 DynamoDbStack을 `bin/cdk.ts` 파일의 CDK 애플리케이션 정의에 추가합니다. 완료 후 `bin/cdk.ts`파일은 다음과 같이 보일 것입니다:

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WebApplicationStack } from "../lib/web-application-stack";
import { NetworkStack } from "../lib/network-stack";
import { EcrStack } from "../lib/ecr-stack";
import { EcsStack } from "../lib/ecs-stack";
import { CiCdStack } from "../lib/cicd-stack";
import { DynamoDbStack } from '../lib/dynamodb-stack';

const app = new cdk.App();
new WebApplicationStack(app, "TodoList-Website");
const networkStack = new NetworkStack(app, "TodoList-Network");
const ecrStack = new EcrStack(app, "TodoList-ECR");
const ecsStack = new EcsStack(app, "TodoList-ECS", {
  vpc: networkStack.vpc,
  ecrRepository: ecrStack.ecrRepository
});
new CiCdStack(app, "TodoList-CICD", {
    ecrRepository: ecrStack.ecrRepository,
    ecsService: ecsStack.ecsService.service
});
const dynamoDbStack = new DynamoDbStack(app, "TodoList-DynamoDB", {
    vpc: networkStack.vpc,
    fargateService: ecsStack.ecsService.service
});
```

`dynamodb-stack.ts`파일 안에 필요한 모듈을 import 합니다:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
```

다음 속성 인터페이스를 정의하여 스택이 의존하는 Constructs를 정의합니다:

```typescript
interface DynamoDbStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  fargateService: ecs.FargateService;
}
```

이제 속성 객체를 인자로 받도록 DBStack의 생성자를 변경합니다:

```typescript
  constructor(scope: cdk.App, id: string, props: DynamoDbStackProps) {
```

다음으로 트래픽이 VPC와 DynamoDB 데이터베이스간에 안전하게 이동할 수 있도록 VPC 엔드포인트를 정의합니다:

```typescript
const dynamoDbEndpoint = props.vpc.addGatewayEndpoint("DynamoDbEndpoint", {
  service: ec2.GatewayVpcEndpointAwsService.DYNAMODB
});

const dynamoDbPolicy = new iam.PolicyStatement();
dynamoDbPolicy.addAnyPrincipal();
dynamoDbPolicy.addActions("*");
dynamoDbPolicy.addAllResources();

dynamoDbEndpoint.addToPolicy(
  dynamoDbPolicy
);
```

다음으로 DynamoDB 테이블을 정의해야합니다. `DynamoDbStack` 클래스에서 다음 코드를 작성합니다:

```typescript
export class DynamoDbStack extends cdk.Stack {
  public readonly table: dynamodb.Table;

  constructor(scope: cdk.App, id: string, props: DynamoDbStackProps) {
    ...
```

생성자에 다음 코드를 복사 또는 작성합니다:

```typescript
this.table = new dynamodb.Table(this, "Table", {
  tableName: "TodoTable",
  partitionKey: {
    name: "id",
    type: dynamodb.AttributeType.NUMBER
  }
});
```

마지막으로 ECS 클러스터가 DynamoDB에 접근할 수 있도록 필요한 권한을 정의하는 IAM 역할을 추가합니다:

```typescript
const fargatePolicy = new iam.PolicyStatement();
fargatePolicy.addActions(
  // ECS 태스크가 DynamoDB의 TodoTable에만 상호 작용할 수 있도록 허용
  "dynamodb:Scan",
  "dynamodb:Query",
  "dynamodb:UpdateItem",
  "dynamodb:GetItem",
  "dynamodb:DescribeTable"
);
fargatePolicy.addResources(
  "arn:aws:dynamodb:*:*:table/TodoTable*"
);
props.fargateService.taskDefinition.addToTaskRolePolicy(
  fargatePolicy
);
```

완료 후 DynamoDB 테이블을 배포합니다:

```sh
cdk deploy TodoList-ECS TodoList-DynamoDB --require-approval never
```

`Do you wish to deploy these changes (y/n)?`와 같은 메시지가 표시되면 `y`를 입력합니다.

배포가 완료된 후 터미널에서 다음 AWS CLI 명령을 실행하여 새로 생성된 테이블의 세부 정보를 볼 수 있습니다:

```sh
aws dynamodb describe-table --table-name TodoTable
```

테이블에 저장된 모든 아이템을 확인하기 위해 다음 명령을 실행하면, 테이블이 비어있음을 알 수 있습니다:

```sh
aws dynamodb scan --table-name TodoTable
```

```json
{
    "Count": 0,
    "Items": [],
    "ScannedCount": 0,
    "ConsumedCapacity": null
}
```

#### DynamoDB 테이블에 아이템 추가

DynamoDB API **BatchWriteItem**을 사용하여 제공된 JSON 파일로 테이블에 투두 아이템을 일괄 삽입할 수 있습니다. 이를 위해 터미널에서 다음 명령을 실행합니다 (처리되지 않은 항목이 없다는 응답이 나와야합니다):

```sh
cd ../
aws dynamodb batch-write-item --request-items "$(cat ./source/module-3/data/todolist-dynamodb.json)"
```

이제 위의 아이템 확인 명령을 다시 실행하여 테이블을 스캔하면 테이블에 항목이 추가된 걸 볼 수 있습니다:

```sh
aws dynamodb scan --table-name TodoTable
```

### 최초 *실제* 코드 변경 커밋

#### 업데이트 된 Flask 서비스 코드 복사
이제 테이블에 데이터를 로드하였으니 애플리케이션 코드를 변경하여 모듈 2에서 사용한 정적 JSON 파일이 아닌 테이블에서 데이터를 읽어오도록 하겠습니다. Flask 마이크로서비스를 위한 새로운 Python 파일들을 포함하였고, 정적 JSON 파일을 읽는 대신 DynamoDB 요청을 하도록 하겠습니다.

요청은 **boto3**라는 AWS Python SDK를 사용하여 구성됩니다. 이 SDK는 Python 코드를 통해 AWS 서비스와 상호 작용할 수 있는 간단하면서도 강력한 방법입니다. 이로 워크샵의 일부로 이미 실행한 AWS API 및 CLI 명령과 크게 대칭되는 서비스 클라이언트 정의 및 기능을 사용할 수 있습니다. **boto3**를 사용하여 이러한 명령을 Python 코드로 변환하는 것이 간단해집니다. 

```sh
cp source/module-3/app/service/* app/service/
```

app/service/todoTableClient.py 파일을 열어 region 부분 변경이 필요하다면 수정합니다.

```python
region = 'ap-northeast-2'
client = boto3.client('dynamodb', region_name=region)
```

#### 업데이트 된 코드를 CI/CD 파이프라인으로 푸시

이제, git 명령으로 코드 변경 사항을 CodeCommit에 체크인합니다. 다음 명령을 실행하여 CI/CD 파이프라인이 시작되도록 코드 변경 사항을 체크인합니다:

```sh
cd app
git add .
git commit -m "Add new integration to DynamoDB."
git push
```

이제 5-10분 정도 이내에 CodePipeline의 CI/CD 파이프라인을 통해 Amazon ECS의 AWS Fargate에 배포된 Flask 서비스에 코드 변경이 적용되는걸 확인할 수 있습니다. AWS CodePipeline 콘솔을 탐색하여 파이프라인을 통한 변경 진행 상황을 확인해보세요.

#### S3의 웹사이트 콘텐츠 업데이트

마지막으로, DynamoDB와 연동된 새로운 API가 적용되도록 새로운 웹사이트를 S3 버킷에 게시해야합니다. 새 index.html 파일은 module-2의 웹 내용을 기반으로 하되, API 엔드포인트가 DynamoDB에서 데이터를 가져오도록 수정되었습니다.

NLB를 가르키도록 엔드포인트를 교체한 후 S3 호스팅 웹사이트를 업데이트하고 `TodoList-Website` 스택을 배포합니다:

엔드포인트 복사 붙여넣기를 위해 아래줄에 코드를 복사합시다.
> var todosApiEndpoint = 'http://TodoLi-Servi-3HzYuLxjnzWA-8f446e4a3b27e844.elb.ap-northeast-2.amazonaws.com'

```sh
cp source/module-3/web/* web/
```
다시 index.html 파일을 열어 REPLACE_ME 부분에 복사한 엔드포인트를 붙여넣습니다.

```sh
cd cdk/
cdk deploy TodoList-Website
```

투두리스트 웹사이트를 다시 방문하여 DynamoDB 테이블에서 로드되는 새 투두들을 확인할 수 있습니다.

이것으로 모듈 3을 마치겠습니다.

## [AWS Developer Center](https://developer.aws)
