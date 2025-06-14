import * as cdk from 'aws-cdk-lib';
import path = require('path');

import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'

/**
 * WebApplicationStack
 * S3와 CloudFront를 이용해 정적 웹 애플리케이션을 배포하는 CDK 스택
 *
 * 구성 요소:
 *  - S3 버킷: 정적 파일 저장
 *  - CloudFront 배포: 전 세계 CDN 전달
 *  - OAC(Origin Access Control): CloudFront에서만 버킷 접근 허용
 *  - BucketDeployment: 로컬 'web' 디렉토리의 파일을 S3에 업로드
 */
export class WebApplicationStack extends cdk.Stack {
  constructor(app: cdk.App, id: string) {
    super(app, id);

    // 1. 웹 애플리케이션 루트 경로 설정
    // 현재 파일(__dirname)에서 상위 2단계로 이동하여 'web' 폴더를 가리킴
    const webAppRoot = path.resolve(__dirname, '..', '..', 'web');

    // 2. S3 버킷 생성
    // 정적 웹사이트 호스팅을 위한 S3 버킷 생성
    // websiteIndexDocument: 기본 인덱스 파일을 index.html로 설정
    const bucket = new s3.Bucket(this, "Bucket", {
      websiteIndexDocument: "index.html"
    });

    // 3. Origin Access Control (OAC) 생성
    // CloudFront에서만 S3 버킷에 접근할 수 있도록 하는 최신 방식의 접근 제어
    const oac = new cloudfront.S3OriginAccessControl(this, "OAC", {
      description: "OAC for todo-list"
    });

    // 4. S3 버킷 정책 설정
    // CloudFront 서비스만 S3 객체를 읽을 수 있도록 IAM 정책 추가
    // AWS:SourceArn 조건을 통해 특정 CloudFront 배포에서만 접근 허용
    bucket.addToResourcePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject'], // S3 객체 읽기 권한만 허용
      resources: [`${bucket.bucketArn}/*`], // 버킷 내 모든 객체에 대해
      principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')], // CloudFront 서비스에게만
      conditions: {
        StringEquals: {
          // 현재 계정의 CloudFront 배포에서만 접근 가능하도록 제한
          'AWS:SourceArn': `arn:aws:cloudfront::${cdk.Stack.of(this).account}:distribution/*`
        }
      }
    }));

    // 5. CloudFront 배포 생성
    // 전 세계에 콘텐츠를 빠르게 전달하기 위한 CDN 서비스
    const cdn = new cloudfront.Distribution(this, "CloudFront", {
      defaultBehavior: {
        // S3 버킷을 오리진으로 설정하고 OAC를 통해 접근
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket, {
          originAccessControl: oac,
          originPath: '/web' // S3 버킷 내 /web 경로를 루트로 설정
        }),
        // GET, HEAD, OPTIONS 메서드만 허용 (정적 콘텐츠용)
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        // HTTP와 HTTPS 모두 허용
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.ALLOW_ALL
      },
      // 루트 경로(/)로 접근 시 기본적으로 반환할 파일
      defaultRootObject: 'index.html'
    });

    // 6. 웹사이트 파일 배포
    // 로컬 'web' 폴더의 파일들을 S3 버킷에 업로드하고 CloudFront 캐시 무효화
    new s3deploy.BucketDeployment(this, "DeployWebsite", {
      sources: [
        // 로컬 웹 애플리케이션 폴더를 소스로 지정
        s3deploy.Source.asset(webAppRoot)
      ],
      destinationKeyPrefix: "web/", // S3 버킷 내 /web/ 경로에 업로드
      destinationBucket: bucket, // 위에서 생성한 버킷에 업로드
      distribution: cdn, // 연결된 CloudFront 배포
      distributionPaths: ['/*'], // 모든 경로의 캐시를 무효화
      retainOnDelete: false // 스택 삭제 시 배포된 파일도 함께 삭제
    });

    // 7. CloudFormation 출력값 설정
    // 배포 완료 후 웹사이트 접근 URL을 출력
    new cdk.CfnOutput(this, "CloudFrontURL", {
      description: "The CloudFront distribution URL", // 출력값 설명
      value: "http://" + cdn.distributionDomainName // CloudFront 도메인 이름
    });
  }
}