# AWS에서 현대 애플리케이션 구축 (CDK)

## **Python** 버전의 현대 애플리케이션 구축 워크샵에 오신걸 환영합니다!

**AWS 경험: 초급**

**완료에 필요한 시간: 3-4시간**

**비용: 사용되는 대부분의 서비스는 AWS 프리티어에 포함됩니다. 포함되지 않는 서비스들에 대해서 하루 $1 이하의 요금이 청구될 수 있습니다.**

워크샵이 끝난 뒤 워크샵에서 생성된 모든 리소스들은 반드시 종료하셔야 추가 과금이 발생하지 않습니다.

**참고:** 비용 예상치는 워크샵을 통해 구축되는 데모 웹사이트에서 트래픽이 거의 또는 전혀 발생하지 않음을 가정합니다.

추가로 코드 작성할 필요없이 대부분의 모든 내용은 복사 붙여넣기로만 진행이 되므로 코드 작성에 대해 부담을 느끼실 필요없이 진행하시면 됩니다. 그리고 추후 복습을 하실때 똑같이 진행할 수 있도록 작성되었으니 이점 참고해주시기 바랍니다.

### 애플리케이션 아키텍처

![Application Architecture](./images/arch-diagram.png)

TodoList 웹사이트는 Amazon CloudFront와 함께 Amazon S3에서 정적 콘텐츠를 제공, Amazon ECS에서 AWS Fargate를 통해 컨테이너로 배포된 마이크로서비스 API 백엔드를 제공, Amazon DynamoDB가 제공하는 관리형 NoSQL 데이터베이스에 데이터를 저장, Amazon Cognito와 통합한 AWS API Gateway를 통해 애플리케이션에서 인증 및 권한 부여 기능을 제공합니다. 사용자 웹사이트 클릭은 Amazon Kinesis Firehose 전송 스트림에 레코드로서 보내어지며, 서버리스 AWS Lambda 함수에 의해 처리되어 Amazon S3에 저장됩니다.

애플리케이션을 변경하고 배포하는 모든 것을 프로그래밍 방식으로 진행하게 됩니다. AWS CDK를 사용하여 필요한 인프라 구성 요소를 생성하며, AWS CodeCommit, CodeBuild, CodePipeline을 활용한 완전 관리되는 CI/CD 스택도 생성하게 됩니다.

## 원본 출처

- [AWS sample](https://github.com/aws-samples/aws-modern-application-workshop)


## 현대 애플리케이션 워크샵 시작

아래 모듈 0 진행을 눌러 실습을 진행해주세요!

### [모듈 0 진행](./module-0/README.md)


### 워크샵 정리 (완료 후)
워크샵에서 생성 및 사용한 모든 리소스들은 반드시 삭제하여야 더 이상 비용이 발생하지 않습니다. AWS 콘솔을 통해 생성한 리소스를 전부 확인하고 삭제하는 것이 좋습니다.  

AWS CDK를 사용하여 리소스를 프로비저닝한 경우, 생성된 CloudFormation 스택을 제거하는 다음 명령으로 리소스를 제거할 수 있습니다:

```
cdk destroy
```

실습을 통해 생성되는 리소스 중 일부 리소스는 cdk에 의해 제거가 되지 않을 수 있습니다. 대표적으로 아래 리소스들은 삭제가 되었는지 확인해보시고, 만약 삭제가되지 않았다면 직접 삭제를 해주시기 바랍니다:

* Amazon ECR: todolist/service	
* Amazon DynamoDB: TodoListTable, TodoListQuestionsTable

TodoList 워크샵에서 생성 및 사용한 모든 리소스의 제거를 아래의 AWS 콘솔에 접근하셔서 확인하기 바랍니다:
* [AWS Kinesis](https://console.aws.amazon.com/kinesis/home)
* [AWS Lambda](https://console.aws.amazon.com/lambda/home)
* [Amazon S3](https://console.aws.amazon.com/s3/home)
* [Amazon API Gateway](https://console.aws.amazon.com/apigateway/home)
* [Amazon Cognito](https://console.aws.amazon.com/cognito/home)
* [AWS CodePipeline](https://console.aws.amazon.com/codepipeline/home)
* [AWS CodeBuild](https://console.aws.amazon.com/codebuild/home)
* [AWS CodeCommit](https://console.aws.amazon.com/codecommit/home)
* [Amazon DynamoDB](https://console.aws.amazon.com/dynamodb/home)
* [Amazon ECS](https://console.aws.amazon.com/ecs/home)
* [Amazon EC2](https://console.aws.amazon.com/ec2/home)
* [Amazon VPC](https://console.aws.amazon.com/vpc/home)
* [AWS IAM](https://console.aws.amazon.com/iam/home)
* [AWS CloudFormation](https://console.aws.amazon.com/cloudformation/home)
* [Amazon CloudFront](https://console.aws.amazon.com/cloudfront/home)


[모듈 0 진행](./module-0/README.md)


## [AWS Developer Center](https://developer.aws)

## [AWS CDK] (https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib-readme.html)
