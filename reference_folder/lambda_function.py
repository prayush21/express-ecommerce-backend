import json
import base64
import os
import boto3
from io import BytesIO

def lambda_handler(event, context):
    # Initialize S3 client
    s3 = boto3.client('s3')
    # Get the S3 bucket name from environment variable
    bucket_name = "clothing-images-ecom"
    
    try:
        # Get the content type, handling different possible header formats
        headers = {k.lower(): v for k, v in event['headers'].items()}
        content_type = headers.get('content-type') or headers.get('Content-Type')
        
        if not content_type:
            raise ValueError("Content-Type header is missing")

        # Check if the body is base64 encoded
        is_base64_encoded = event.get('isBase64Encoded', False)
        body = base64.b64decode(event['body']) if is_base64_encoded else event['body'].encode()
        
    
        # Find the boundary
        boundary = content_type.split('boundary=')[1].encode()
        
        # Split the body into parts
        parts = body.split(boundary)
        
        
        # Find the file part
        file_part = next(part for part in parts if b'filename' in part)
        
        # Extract filename and file content
        headers, content = file_part.split(b'\r\n\r\n', 1)
        filename = headers.split(b'filename="')[1].split(b'"')[0].decode()
        
        
        # Remove the last two bytes (--) from the content
        content = content[:-2]
        
        # Upload the file to S3
        s3.upload_fileobj(BytesIO(content), bucket_name, filename)
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': f'File {filename} uploaded successfully', 'url': f'https://{bucket_name}.s3.amazonaws.com/{filename}'}),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'  # Adjust this for your CORS needs
            }
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'  # Adjust this for your CORS needs
            }
        }