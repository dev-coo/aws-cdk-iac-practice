# 모듈 2: AWS Fargate로 서비스 생성

![Architecture](../images/module-2/architecture-module-2.png)

**완료에 필요한 시간:** 60분

---
**시간이 부족한 경우:** `module-2/cdk`에 있는 완전한 레퍼런스 AWS CDK 코드를 참고하세요

---

**사용된 서비스:**

* [AWS CloudFormation](https://aws.amazon.com/cloudformation/)
* [AWS Identity and Access Management (IAM)](https://aws.amazon.com/iam/)
* [Amazon Virtual Private Cloud (VPC)](https://aws.amazon.com/vpc/)
* [Amazon Elastic Load Balancing](https://aws.amazon.com/elasticloadbalancing/)
* [Amazon Elastic Container Service (ECS)](https://aws.amazon.com/ecs/)
* [AWS Fargate](https://aws.amazon.com/fargate/)
* [AWS Elastic Container Registry (ECR)](https://aws.amazon.com/ecr/)
* [AWS CodePipeline](https://aws.amazon.com/codepipeline/)
* [AWS CodeDeploy](https://aws.amazon.com/codedeploy/)
* [AWS CodeBuild](https://aws.amazon.com/codebuild/)

### 개요

모듈 2에서는 [AWS CDK](https://aws.amazon.com/cdk/)를 사용하여 [Amazon Elastic Container Service](https://aws.amazon.com/ecs/)의 [AWS Fargate](https://aws.amazon.com/fargate/)로 호스팅 되는 마이크로서비스를 생성하여 투두리스트 웹사이트의 애플리케이션 백엔드를 구성합니다. AWS Fargate는 Amazon ECS의 배포 옵션으로서 클러스터 또는 서버 관리 없이 컨테이너를 배포할 수 있습니다. Python을 사용하여 Network Load Balancer 뒤에서 동작하는 Flask 앱의 도커 컨테이너를 생성하여 투두리스트 백엔드를 구성합니다. 이를 통해 프론트엔드 웹사이트와 통합되는 마이크로서비스 백엔드를 형성할 것 입니다.

### AWS CDK를 사용하여 핵심 인프라 생성

서비스를 생성하기 전에 서비스가 사용할 코어 인프라 환경을 생성해야 합니다. 이는 [Amazon VPC](https://aws.amazon.com/vpc/)의 네트워킹 인프라와 ECS와 컨테이너가 AWS에서 필요한 권한을 정의하는 [AWS Identity and Access Management](https://aws.amazon.com/iam/) 역할을 포함합니다.

작성할 AWS CDK 애플리케이션은 아래 리소스들을 생성합니다:

* [**Amazon VPC**](https://aws.amazon.com/vpc/) - 10.0.0.0/16 프라이빗 IP 공간의 4개의 서브넷(2개의 퍼블릭, 2개의 프라이빗)과 필요로하는 라우트 테이블 구성을 포함하는 네트워크 환경. 이 네트워크의 서브넷은 별도의 AWS 가용 영역(AZ)에서 생성되어 AWS 리전의 여러 물리적 시설에 걸쳐 고가용성을 지원합니다. [여기](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RegionsAndAvailabilityZones.html)에서 고가용성을 달성하는데 가용 영역이 어떻게 도움이 되는지 자세히 알아볼 수 있습니다.
* [**2개의 NAT Gateway**](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html) (여러 AZ에 걸쳐 각 퍼블릭 서브넷마다 1개씩) - 프라이빗 서브넷에 배포할 컨테이너가 인터넷에서 필요한 패키지 등을 다운로드할 수 있도록 합니다.
* [**DynamoDB VPC Endpoint**](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/vpc-endpoints-dynamodb.html) - 마이크로서비스 백엔드는 지속성을 위해 [Amazon DynamoDB](https://aws.amazon.com/dynamodb/)와 통합됩니다 (모듈 3에서 진행).
* [**Security Group**](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_SecurityGroups.html) - 도커 컨테이너가 Network Load Balancer를 통해 인터넷으로부터 8080 포트로 트래픽을 수신할 수 있도록 합니다.
* [**IAM 역할**](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html) - 인증 및 접근 관리 역할이 생성됩니다. 이 역할은 워크샵 전체에서 DynamoDB, S3 등과 같은 다른 AWS 서비스 접근에 사용됩니다.

`cdk` 디렉토리의 `lib` 폴더에서 `network-stack.ts` 이름의 새 파일을 생성합니다:

```sh
cd cdk
touch lib/network-stack.ts
```

생성한 파일에서 스켈레톤 CDK 스택 구조를 정의하고 `NetworkStack`으로 클래스명을 지정합니다:

```typescript
import * as cdk from 'aws-cdk-lib';

export class NetworkStack extends cdk.Stack {
  constructor(scope: cdk.App, id:string) {
    super(scope, id);

    // The code that defines your stack goes here
  }
}
```

그런 다음 `bin/cdk.ts`의 CDK 애플리케이션 정의에 NetworkStack을 추가합니다. 최종적으로 `bin/cdk.ts`는 다음처럼 보여야 합니다:

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WebApplicationStack } from "../lib/web-application-stack";
import { NetworkStack } from "../lib/network-stack";

const app = new cdk.App();
new WebApplicationStack(app, "TodoList-Website");
const networkStack = new NetworkStack(app, "TodoList-Network");
```

이제 AWS CDK를 사용하여 VPC를 정의합니다. 다시 한번 강조드리자면, AWS CDK는 높은 수준의 추상화를 제공하여 AWS 구성 요소 및 서비스를 쉽게 구현할 수 있도록 합니다. 한번 확인해보겠습니다.

`network-stack.ts` 파일에서 다음 VPC 컨스트럭츠를 정의합니다:

```typescript
import * as cdk from 'aws-cdk-lib';

import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  
  constructor(scope: cdk.App, id:string) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, "VPC");
  }
}
```

> **참고:** `ec2.Vpc`의 인스턴스를 다른 스택이 참조할 수 있도록 읽기 전용 속성을 할당합니다.

일부 속성을 재정의하여 생성중인 VPC를 사용자 정의 해보겠습니다. VPC 정의를 다음과 같이 변경합니다:

```typescript
this.vpc = new ec2.Vpc(this, "VPC", {
  natGateways: 1,
  maxAzs: 2
});
```

구축하려는 최대 NAT 게이트웨이 수와 배포하려는 최대 가용 영역의 수를 정의했습니다.

> **참고:** 위의 변경을 한 후 `network-stack.ts` 파일과 `source/module-2/cdk/lib` 폴더에 있는 파일을 비교하고, 동일한지 확인 하시기 바랍니다.

이제 다음 명령을 사용하여 VPC를 배포합니다:

```sh
cdk deploy TodoList-Network --require-approval never
```

## Module 2a: AWS Fargate로 서비스 배포

### Flask 서비스 컨테이너 생성

#### 도커 이미지 생성

다음으로 TodoList 백엔드를 Flask로 작성된 마이크로서비스 API로 실행하는데 필요한 모든 코드 및 구성을 포함하는 도커 컨테이너 이미지를 만들겠습니다. 로컬 환경에서 도커 컨테이너 이미지를 빌드한 다음 Amazon Elastic Container Registry로 푸시합니다. 이를 통해 Fargate로 서비스를 만들 때 컨테이너 이미지를 가져올 수 있습니다.

서비스 백엔드를 실행하는데 필요한 모든 코드는 프로젝트의 디렉토리 `module-2/app/`에 저장되어있습니다. Flask를 사용하여 서비스 API를 생성하는 Python 코드를 검토하려면 `module-2/app/service/todo-service.py` 파일을 확인하세요.

도커가 로컬 환경에 설치되어 있다면, 도커 이미지를 로컬에서 빌드하기 위해 터미널에 다음 명령을 실행하면 됩니다:

새 터미널을 열어서 다음 명령을 실행합니다:

```sh
mkdir app && cd app
```

애플리케이션 코드를 복사합니다:

```sh
cp -R ../source/module-2/app/* .
```

준비되어있는 Dockerfile로 Docker 이미지를 생성합니다:
먼저 설치한 docker desktop을 실행해주세요

```sh
docker buildx build --platform linux/amd64 \
  -t $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$(aws configure get region).amazonaws.com/todolist/service:latest \
  --load .
```

도커가 애플리케이션이 필요로하는 모든 필수 종속성 패키지를 다운로드하여 설치하고 빌드 된 이미지의 태그를 출력합니다. **나중에 참조할 수 있도록 태그를 복사합니다. 밑의 예제에서의 태그는 다음과 같습니다: 111111111111.dkr.ecr.us-east-1.amazonaws.com/todolist/service:latest**

```
Successfully built 8bxxxxxxxxab
Successfully tagged 111111111111.dkr.ecr.us-east-1.amazonaws.com/todolist/service:latest
```

#### 로컬에서 서비스 테스트

로컬 환경에서 이미지를 테스트하여 예상대로 작동하는지 테스트해보겠습니다. 아래 명령을 실행하여 컨테이너를 로컬에 배포합니다:

```sh
docker run -p 8080:8080 $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$(aws configure get region).amazonaws.com/todolist/service:latest -d
```

컨테이너가 로컬에서 작동중인걸 확인할 수 있습니다:

```
 * Running on http://localhost:8080/ (Press CTRL+C to quit)
```

로컬에서 서비스를 테스트해보기 위해 웹 브라우저를 열고 다음 URL에 접속합니다:
http://localhost:8080/todos

문제없이 동작하면 `module-2/app/service/todo-list.json`에 저장된 JSON 문서를 반환하는 응답을 볼 수 있습니다.

서비스 테스트가 완료되면 PC 또는 Mac에서 CTRL-c를 눌러 서비스를 중지할 수 있습니다.

#### Amazon Elastic Container Registry (ECR) 리포지토리 생성

서비스를 로컬에서 성공적으로 테스트하였다면 [Amazon Elastic Container Registry](https://aws.amazon.com/ecr/) (Amazon ECR)에 컨테이너 이미지 리포지토리를 생성하고 이미지를 푸시할 준비가 되었습니다. CDK를 사용하여 레지스트리를 만들기 위해 `lib` 폴더에 `ecr-stack.ts` 이라는 새 파일을 생성합니다:

```sh
cd ../cdk/
touch lib/ecr-stack.ts
```

이전과 마찬가지로 CDK 스택의 스켈레톤 구조를 정의합니다:

```typescript
import * as cdk from 'aws-cdk-lib';

export class EcrStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

  }
}
```

그런 다음 이전에 한 것처럼 ECRStack을 `bin/cdk.ts`의 CDK 애플리케이션 정의에 추가합니다. 완료되면 `bin/cdk.ts`는 다음처럼 보여야 합니다:

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WebApplicationStack } from "../lib/web-application-stack";
import { NetworkStack } from "../lib/network-stack";
import { EcrStack } from "../lib/ecr-stack";

const app = new cdk.App();
new WebApplicationStack(app, "TodoList-Website");
const networkStack = new NetworkStack(app, "TodoList-Network");
const ecrStack = new EcrStack(app, "TodoList-ECR");
```

그런 다음 ECR 리포지토리 정의를 EcrStack에 추가합니다.

다음 import 구문을 첫줄의 `import cdk` 구문 다음에 추가합니다:

```typescript
import * as ecr from 'aws-cdk-lib/aws-ecr';
```

EcrStack을 다음처럼 작성합니다:

```typescript
export class EcrStack extends cdk.Stack {
  public readonly ecrRepository: ecr.Repository;

  constructor(scope: cdk.App, id: string) {
    super(scope, id);
    this.ecrRepository = new ecr.Repository(this, "Repository", {
      repositoryName: "todolist/service"
    });
  }
}
```

> **참고:** `ecr.Repository`의 인스턴스를 다른 스택에서 참조할 수 있도록 읽기전용 속성을 할당합니다.

이제 다음 명령어로 ECR 스택을 배포합니다:

```sh
cdk deploy TodoList-ECR --require-approval never
```

브라우저에서 ECR 대시보드로 이동하여 방금 생성한 ECR 리포지토리가 목록에있는지 확인합니다.

#### 도커 이미지를 Amazon ECR에 푸시

컨테이너 이미지를 새 리포지토리에 푸시하기위해서는 도커 클라이언트를 위한 인증 자격증명을 획득해야합니다. 아래 명령을 실행하면 도커 클라이언트를 위한 자격증명을 획득하는 로그인 명령을 보여주며, 그 명령을 자동으로 실행해줍니다 (명령은 $를 포함합니다). 문제 없이 명령이 수행되면 'Login Succeeded'를 볼 수 있습니다:

```sh
aws ecr get-login-password | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$(aws configure get region).amazonaws.com
```

그런 다음, 위에서 복사한 태그를 사용하여 ECR 리포지토리에 이미지를 푸시합니다. 아래 명령을 사용하면 도커는 생성한 이미지와 함께 연관된 모든 이미지를 Amazon ECR에 푸시할 것 입니다:

```sh
docker push $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$(aws configure get region).amazonaws.com/todolist/service:latest
```

ECR 리포지토리에 저장된 직접 푸시한 이미지를 보기 위해 아래 명령을 실행합니다:

```sh
aws ecr describe-images --repository-name todolist/service
```

### AWS Fargate와 Amazon ECS Service 생성

이제 ECR에 이미지가 저장되었으며, AWS Fargate를 사용하여 Amazon ECS에서 호스팅되는 서비스에 배포할 수 있습니다. 이전 모듈의 일부로 로컬에서 테스트한 동일한 서비스가 클라우드로 배포되고 Network Load Balancer를 통해 퍼블릭하게 접근할 수 있도록 해보겠습니다.

먼저 **Amazon Elastic Container Service (ECS)**에서 **Cluster**를 생성할 것 입니다. **Cluster**는 서비스 컨테이너가 배포될 "서버" 클러스터를 나타냅니다. 서버가 "인용문" 내에 있는 이유는 **AWS Fargate**를 사용하기 때문입니다. Fargate를 사용하면 서버를 실제로 프로비저닝하거나 관리할 필요 없이 컨테이너를 클러스터에 배포할 수 있습니다.

이제 ECS 인스턴스를 정의합니다.

이전과 마찬가지로 `lib` 폴더에 `ecs-stack.ts`이라는 파일을 생성합니다:

```sh
touch lib/ecs-stack.ts
```

CDK 스택의 스켈레톤 구조를 정의합니다:

```typescript
import * as cdk from 'aws-cdk-lib';

export class EcsStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

  }
}
```

우리가 생성중인 `EcsStack` 스택은 이전에 생성한 두개의 스택과 종속성을 가집니다. 종속성과 속성을 스택으로 가져오는 방법으로 속성 인터페이스 사용이 권장됩니다. 속성 인터페이스를 정의해보겠습니다.

`EcsStack` 정의 위에, 다음 모듈을 import 합니다:

```typescript
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
```

그리고 EcsStack 정의 위에 다음 속성 객체를 정의합니다:

```typescript
interface EcsStackProps extends cdk.StackProps {
    vpc: ec2.Vpc,
    ecrRepository: ecr.Repository
}
```

정의한 속성 객체를 EcsStack의 생성자에서 인자로 받도록 합니다:

```typescript
  constructor(scope: cdk.App, id: string, props: EcsStackProps) {
```

EcsStack에서 필요한 나머지 AWS CDK 모듈을 import 합니다:

```typescript
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as iam from 'aws-cdk-lib/aws-iam';
```

이후 워크샵에서 생성할 다른 스택에서 사용될 수 있도록 ecsCluster와 ecsService를 노출(expose)해야 합니다. 이를 위해 EcsStack 상단에 두개의 속성을 정의합니다:

```typescript
export class EcsStack extends cdk.Stack {
  public readonly ecsCluster: ecs.Cluster;
  public readonly ecsService: ecsPatterns.NetworkLoadBalancedFargateService;

  constructor(scope: cdk.App, id: string, props: EcsStackProps) {
    super(scope, id);

  }
}
```

ECS Cluster 객체를 정의합니다:

```typescript
this.ecsCluster = new ecs.Cluster(this, "Cluster", {
  clusterName: "TodoList-Cluster",
  vpc: props.vpc
});
this.ecsCluster.connections.allowFromAnyIpv4(ec2.Port.tcp(8080));
```

`EcsStackProps` 속성에 정의된 VPC (`props.vpc`)를 어떻게 참조하는지 살펴 볼 필요가 있습니다. [AWS CDK](https://aws.amazon.com/cdk/)는 CloudFormation 객체간에 자동으로 참조를 생성합니다. 또 생성된 `ecs.Cluster`의 인스턴스를 로컬 속성에 할당하여 해당 스택은 물론 다른 스택에서 참조될 수 있도록 하는 부분도 참고하시기 바랍니다:

```typescript
this.ecsService = new ecsPatterns.NetworkLoadBalancedFargateService(this, "Service", {
  // ECS 클러스터 지정 - 컨테이너들이 실행될 논리적 그룹
  cluster: this.ecsCluster,  
  // 실행할 태스크(컨테이너) 개수 - 1개면 단일 인스턴스, 2개 이상이면 고가용성
  desiredCount: 1,  
  // 로드밸런서를 인터넷에 노출할지 여부 - true면 외부에서 접근 가능
  publicLoadBalancer: true,  
  // 컨테이너 실행 관련 상세 설정
  taskImageOptions: {
    // CloudWatch 로그 활성화 - 컨테이너 로그를 AWS에서 확인 가능
    enableLogging: true,
    // 컨테이너 이름 - ECS 콘솔에서 보이는 이름
    containerName: "TodoList-Service",
    // 컨테이너가 리스닝하는 포트 - Flask 앱이 8080 포트 사용
    containerPort: 8080,
    // 사용할 Docker 이미지 - ECR 리포지토리에서 latest 태그 자동 선택
    image: ecs.ContainerImage.fromEcrRepository(props.ecrRepository),
  }
});
this.ecsService.service.connections.allowFrom(ec2.Peer.ipv4(props.vpc.vpcCidrBlock),ec2.Port.tcp(8080));
```

컨테이너 포트의 정의와 AWS CDK에 의해 생성된 EC2 SecurityGroups 규칙을 수정하여 우리가 생성한 VPC의 CIDR 블록에서의 요청만 허가하도록 제한하는 부분을 확인하시기 바랍니다.

다음으로 추가 IAM 정책 Statements를 실행(Execution)과 작업 역할(Task Roles)에 추가합니다:

```typescript
const taskDefinitionPolicy = new iam.PolicyStatement();
taskDefinitionPolicy.addActions(
  // ECS가 awsvpc 네트워킹 모드를 위해 네트워크 인터페이스를 관리할 수 있도록 하는 권한
  "ec2:AttachNetworkInterface",        // 네트워크 인터페이스 연결
  "ec2:CreateNetworkInterface",        // 네트워크 인터페이스 생성
  "ec2:CreateNetworkInterfacePermission", // 네트워크 인터페이스 권한 생성
  "ec2:DeleteNetworkInterface",        // 네트워크 인터페이스 삭제
  "ec2:DeleteNetworkInterfacePermission", // 네트워크 인터페이스 권한 삭제
  "ec2:Describe*",                     // EC2 리소스 정보 조회
  "ec2:DetachNetworkInterface",        // 네트워크 인터페이스 분리

  // ECS가 로드밸런서를 관리하고 트래픽을 컨테이너로 라우팅하기 위한 권한
  "elasticloadbalancing:DeregisterInstancesFromLoadBalancer", // 로드밸런서에서 인스턴스 해제
  "elasticloadbalancing:DeregisterTargets",                   // 타겟 그룹에서 타겟 해제
  "elasticloadbalancing:Describe*",                           // 로드밸런서 정보 조회
  "elasticloadbalancing:RegisterInstancesWithLoadBalancer",   // 로드밸런서에 인스턴스 등록
  "elasticloadbalancing:RegisterTargets",                     // 타겟 그룹에 타겟 등록

  // ECS가 IAM 역할이 할당된 태스크를 실행할 수 있도록 하는 권한
  "iam:PassRole",

  // ECS가 CloudWatch에 로그를 생성하고 전송할 수 있도록 하는 권한
  "logs:DescribeLogStreams",           // 로그 스트림 정보 조회
  "logs:CreateLogGroup"                // 로그 그룹 생성
);
taskDefinitionPolicy.addAllResources();

// 실행 역할(Execution Role)에 정책 추가 - ECS 서비스가 컨테이너를 시작하기 위한 권한
this.ecsService.service.taskDefinition.addToExecutionRolePolicy(
  taskDefinitionPolicy
);

const taskRolePolicy = new iam.PolicyStatement();
taskRolePolicy.addActions(
  // ECS 태스크가 ECR에서 Docker 이미지를 다운로드할 수 있도록 하는 권한
  "ecr:GetAuthorizationToken",         // ECR 인증 토큰 획득
  "ecr:BatchCheckLayerAvailability",   // 이미지 레이어 가용성 확인
  "ecr:GetDownloadUrlForLayer",        // 이미지 레이어 다운로드 URL 획득
  "ecr:BatchGetImage",                 // 이미지 매니페스트 정보 획득
  
  // ECS 태스크가 CloudWatch에 로그를 업로드할 수 있도록 하는 권한
  "logs:CreateLogStream",              // 로그 스트림 생성
  "logs:CreateLogGroup",               // 로그 그룹 생성
  "logs:PutLogEvents"                  // 로그 이벤트 전송
);
taskRolePolicy.addAllResources();

// 태스크 역할(Task Role)에 정책 추가 - 컨테이너 내부에서 AWS 서비스에 접근하기 위한 권한
this.ecsService.service.taskDefinition.addToTaskRolePolicy(
  taskRolePolicy
);
```

그런 후 이전과 마찬가지로 EcsStack을 `bin/cdk.ts`의 CDK 애플리케이션 정의에 추가합니다. 완료 후 `bin/cdk.ts`는 다음처럼 보여야 합니다:

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WebApplicationStack } from "../lib/web-application-stack";
import { NetworkStack } from "../lib/network-stack";
import { EcrStack } from "../lib/ecr-stack";
import { EcsStack } from "../lib/ecs-stack";

const app = new cdk.App();
new WebApplicationStack(app, "TodoList-Website");
const networkStack = new NetworkStack(app, "TodoList-Network");
const ecrStack = new EcrStack(app, "TodoList-ECR");
const ecsStack = new EcsStack(app, "TodoList-ECS", {
    vpc: networkStack.vpc,
    ecrRepository: ecrStack.ecrRepository
});
```

#### ECS 용 Server Linked 역할 생성

이전에 이미 ECS를 사용한 경우 이 단계를 건너 뛰고 다음 단계로 넘어갈 수 있습니다. 이전에 ECS를 사용한 적이 없다면 IAM에서 ECS 서비스 자체에 계정 내 ECS API 요청을 할 수 있는 권한을 부여하는 서비스 연결 역할을 생성해야합니다. 이게 필요한 이유는 ECS에서 서비스를 생성할 때 서비스가 도커 이미지를 가져오고, 새 작업을 생성하는 등의 작업을 수행하기 위해 계정 내에서 API를 호출하기 때문입니다.

이 역할을 만들지 않으면, ECS 서비스에 필요한 작업을 수행할 수 있는 권한이 부여되지 않습니다. 역할을 작성하려면 터미널에서 다음 명령을 실행합니다:

```sh
aws iam create-service-linked-role --aws-service-name ecs.amazonaws.com
```

> An error occurred (InvalidInput) when calling the CreateServiceLinkedRole operation: Service role name AWSServiceRoleForECS has been taken in this account, please try a different suffix. 라는 오류는 이미 생성한적이 있다는 뜻입니다.

위의 기존 역할에 대한 오류가 반환되면 이전에 계정에서 역할이 자동으로 생성되었음을 나타내므로 무시해도됩니다.

이제 ECS 스택을 배포합니다:

```sh
cdk deploy TodoList-ECS --require-approval never
```

`Do you wish to deploy these changes (y/n)?`와 같은 메시지가 표시되면 `y`를 입력합니다.

서비스가 생성된 후 ECS는 ECR로 푸시한 컨테이너를 실행하는 새 작업을 프로비저닝하고 생성된 NLB에 등록합니다.

#### 서비스 테스트

사용하는 브라우저를 통해 이전 작업 완료 후 출력되는 NLB DNS에 접속하여 작동하는지 확인합니다. CURL 명령을 사용하여 todos 리소스에 요청을 보내봅니다:

```sh
curl http://<replace-with-your-nlb-address>/todos
```

이전에 도커 컨테이너를 로컬에서 테스트할 때 본 JSON 응답과 동일한 응답을 볼 수 있습니다.

> **참고:** 최초 접속 시 시간이 소요될 수 있습니다. 너무 오래 걸릴 경우 취소 (Ctrl-d) 후 다시 해보시길 바랍니다.

> **참고:** Network Load Balancer는 SSL/TLS 인증서가 설치되어 있지 않으므로 HTTP (http://) 요청만 지원합니다. 이 워크샵에서는 http:// 으로만 요청을 보내야 합니다. https:// 요청은 정상적으로 동작하지 않을 것입니다.

### 투두리스트가 NLB를 호출하도록 변경

#### API 엔드포인트 수정

다음으로, 웹사이트가 이전에 S3에 업로드한 하드 코딩된 데이터를 사용하는 대신 새로운 API 백엔드와 통합해야 합니다. `source/module-2/web` 디렉토리에서 웹 애플리케이션 코드를 복사합니다:

```sh
cp -r ../source/module-2/web/* ../web
```

API 호출에 동일한 NLB URL을 사용하기 위해 `web/index.html` 파일을 업데이트 합니다 (/todos 경로를 포함하지 마세요). 

```html
<script>
  // API 엔드포인트 설정 - NLB 주소로 교체하세요
  var todosApiEndpoint = 'REPLACE_ME'; // 예시: 'TodoLi-Servi-XXXXXXXXXX-XXXXXXXX.elb.ap-northeast-2.amazonaws.com'
</script>
```

#### 투두리스트 웹사이트 업데이트
S3에서 호스팅되는 웹사이트를 업데이트하기 위해 `TodoList-Website` 스택을 배포합니다:

```sh
cdk deploy TodoList-Website --require-approval never
```

업데이트된 투두리스트 웹사이트를 확인하기 위해 모듈 1 마지막에 출력하게끔 한 CloudFront URL을 사용하여 웹사이트에 접속합니다 (**HTTP로 접속하여야 합니다**). AWS Fargate에 배포된 도커 컨테이너에서 동작하는 Flask API로부터 JSON 데이터를 받습니다.


## 모듈 2b: AWS CodePipeline 서비스를 사용한 배포 자동화

![Architecture](../images/module-2/architecture-module-2b.png)

이제 서비스가 시작되어 동작중입니다. 서비스를 운영하며 Flask 서비스의 코드를 변경해야하는 일은 자주 발생하는 작업입니다. 서비스에 새로운 기능을 배포할 때마다 앞선 모든 과정을 반복하는건 개발 속도를 느리게 만드는 병목이 될 수 있습니다. 이를 해결하기 위해 지속적 통합 및 지속적 전달, 또는 CI/CD라 불리우는 기술이 등장합니다!

이번 섹션에서는 GitHub 리포지토리의 코드 변경 사항을 마지막 섹션에서 만든 서비스에 자동으로 전달하는 완전 관리되는 CI/CD 스택을 만들어봅니다.

### GitHub 리포지토리 준비

#### 1. GitHub 리포지토리 생성

GitHub에서 새로운 리포지토리를 생성합니다:

1. [GitHub](https://github.com)에 로그인합니다
2. **New repository** 버튼을 클릭합니다
3. **Repository name**: `cdk-todolist-backend`
4. **Public** 또는 **Private** 선택 (둘 다 가능)
5. **Create repository** 클릭

#### 2. 백엔드 코드를 GitHub에 푸시

현재 app 폴더의 코드를 GitHub 리포지토리에 푸시합니다:

```sh
cd ../app
git init
git add .
git commit -m "Initial commit: TodoList backend service"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/cdk-todolist-backend.git
git push -u origin main
```

`YOUR_GITHUB_USERNAME`을 실제 GitHub 사용자명으로 교체하세요.

#### 3. GitHub Personal Access Token 생성

CodePipeline이 GitHub에 접근할 수 있도록 Personal Access Token을 생성합니다:

1. GitHub에서 **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** 이동
2. **Generate new token (classic)** 클릭
3. **Note**: `AWS CodePipeline Token` 입력
4. **Expiration**: 적절한 기간 선택 (예: 90 days)
5. **권한 선택** (다음 권한들이 필요합니다):
   - ✅ **repo** 
     - repo:status
     - repo_deployment
     - public_repo
     - repo:invite
   - ✅ **admin:repo_hook** (전체 선택)
     - write:repo_hook
     - read:repo_hook
6. **Generate token** 클릭
7. **생성된 토큰을 복사하여 안전한 곳에 저장** (다시 볼 수 없습니다!)

#### 4. AWS Secrets Manager에 토큰 저장

생성한 GitHub 토큰을 AWS Secrets Manager에 저장합니다:

```sh
aws secretsmanager create-secret \
  --name github-token \
  --description "GitHub Personal Access Token for CodePipeline" \
  --secret-string "YOUR_GITHUB_TOKEN_HERE"
```

만약 이미 토큰이 존재한다면 다음 명령어를 실행하여 업데이트 합니다:

```sh
aws secretsmanager update-secret \
  --secret-id github-token \
  --secret-string "YOUR_GITHUB_TOKEN_HERE"
```

`YOUR_GITHUB_TOKEN_HERE`를 실제 토큰 값으로 교체하세요.

### 백엔드 서비스를 위한 CI/CD 스택 생성

이전처럼 `lib` 폴더에 `cicd-stack.ts` 파일을 생성합니다:

```sh
cd ../cdk
touch lib/cicd-stack.ts
```

CDK 스택의 스켈레톤 구조를 정의합니다:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as actions from 'aws-cdk-lib/aws-codepipeline-actions';

interface CiCdStackProps extends cdk.StackProps {
  ecrRepository: ecr.Repository;
  ecsService: ecs.FargateService;
}

export class CiCdStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: CiCdStackProps) {
    super(scope, id);

    // GitHub Personal Access Token 가져오기
    const githubToken = cdk.SecretValue.secretsManager('github-token');

    // CodeBuild 프로젝트 생성
    const codebuildProject = new codebuild.PipelineProject(this, "BuildProject", {
      projectName: "TodoListServiceCodeBuildProject",
      environment: {
        computeType: codebuild.ComputeType.SMALL,
        buildImage: codebuild.LinuxBuildImage.STANDARD_6_0,
        privileged: true,
        environmentVariables: {
          AWS_ACCOUNT_ID: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: cdk.Aws.ACCOUNT_ID
          },
          AWS_DEFAULT_REGION: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: cdk.Aws.REGION
          }
        }
      }
    });

    // ECR 리포지토리에 대한 권한 부여
    props.ecrRepository.grantPullPush(codebuildProject.grantPrincipal);

    // 소스 액션 정의 (GitHub)
    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new actions.GitHubSourceAction({
      actionName: "GitHub-Source",
      owner: 'YOUR_GITHUB_USERNAME',           // ← 실제 GitHub 사용자명으로 변경
      repo: 'cdk-todolist-backend',
      branch: 'main',
      oauthToken: githubToken,
      output: sourceOutput
    });

    // 빌드 액션 정의
    const buildOutput = new codepipeline.Artifact();
    const buildAction = new actions.CodeBuildAction({
      actionName: "Build",
      input: sourceOutput,
      outputs: [buildOutput],
      project: codebuildProject
    });

    // 배포 액션 정의
    const deployAction = new actions.EcsDeployAction({
      actionName: "DeployAction",
      service: props.ecsService,
      input: buildOutput
    });

    // 파이프라인 생성
    const pipeline = new codepipeline.Pipeline(this, "Pipeline", {
      pipelineName: "TodoListPipeline"
    });

    // 파이프라인 스테이지 추가
    pipeline.addStage({
      stageName: "Source",
      actions: [sourceAction]
    });

    pipeline.addStage({
      stageName: "Build",
      actions: [buildAction]
    });

    pipeline.addStage({
      stageName: "Deploy",
      actions: [deployAction]
    });
  }
}
```

**중요**: `YOUR_GITHUB_USERNAME`을 실제 GitHub 사용자명으로 변경하세요!

### CDK 애플리케이션에 CI/CD 스택 추가

`bin/cdk.ts` 파일을 업데이트하여 CI/CD 스택을 추가합니다:

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WebApplicationStack } from "../lib/web-application-stack";
import { NetworkStack } from "../lib/network-stack";
import { EcrStack } from "../lib/ecr-stack";
import { EcsStack } from "../lib/ecs-stack";
import { CiCdStack } from "../lib/cicd-stack";

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
```

### Pipeline 배포

CICD 스택을 배포합니다:

```sh
cdk deploy TodoList-CICD --require-approval never
```

### CI/CD 파이프라인 테스트

#### 코드 변경으로 파이프라인 테스트

파이프라인이 정상적으로 동작하는지 테스트해보겠습니다:

1. **백엔드 코드 수정**: GitHub 리포지토리에서 또는 로컬에서 `service/todo-list.json` 파일을 수정합니다
2. **변경사항 푸시**: 
  app폴더를 루트로 잡고 새로운 터미널을 열어서 다음 명령어를 실행합니다.

   ```sh
   cd ../app
   git add .
   git commit -m "Update todo item for pipeline test"
   git push
   ```

3. **파이프라인 확인**: [AWS CodePipeline 콘솔](https://console.aws.amazon.com/codepipeline/home)에서 파이프라인 실행 상태를 확인합니다

4. **결과 확인**: 약 5-10분 후 TodoList 웹사이트에서 변경사항이 반영되었는지 확인합니다

#### 파이프라인 동작 과정

1. **Source**: GitHub 리포지토리에서 코드 변경 감지
2. **Build**: CodeBuild가 Docker 이미지 빌드 및 ECR에 푸시
3. **Deploy**: ECS 서비스가 새로운 이미지로 자동 업데이트

### 주요 변경사항 요약

- **CodeCommit → GitHub**: 소스 코드 저장소 변경
- **GitHubSourceAction**: GitHub 리포지토리와 연동
- **Personal Access Token**: AWS Secrets Manager를 통한 안전한 인증
- **자동 배포**: 코드 변경시 자동으로 ECS 서비스 업데이트

이것으로 모듈 2를 마치겠습니다.

[모듈 3 진행](../module-3/README.md)


## [AWS Developer Center](https://developer.aws)
