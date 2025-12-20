import boto3
import os
import mimetypes
import sys
import threading

# Configuration
ACCOUNT_ID = "3218be7fd3453af56a94673b5678580b"
ACCESS_KEY_ID = "17566905d2f91ba37c0fbc865d225f71"
SECRET_ACCESS_KEY = "9366c12e39d6e68c53659446542a7742f06360fbd36f181410cee918e50322e8"
BUCKET_NAME = "starsector"
ENDPOINT_URL = f"https://{ACCOUNT_ID}.r2.cloudflarestorage.com"

# Paths to upload
DIRS_TO_UPLOAD = {
    "Starsector": "Starsector",
    "cheerpj-natives": "cheerpj-natives"
}

# Extension map for MIME types (important for browser serving)
mimetypes.add_type("application/java-archive", ".jar")
mimetypes.add_type("application/wasm", ".wasm")
mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("text/html", ".html")
mimetypes.add_type("application/json", ".json")

def upload_directory(local_path, bucket_name, s3_client, root_prefix):
    """
    Recursively uploads a directory to R2.
    root_prefix: The folder name in the bucket (e.g. 'Starsector')
    """
    if not os.path.exists(local_path):
        print(f"Error: Path not found: {local_path}")
        return

    print(f"Starting upload of {local_path} to s3://{bucket_name}/{root_prefix}")
    
    files_to_upload = []
    for root, dirs, files in os.walk(local_path):
        for file in files:
            full_path = os.path.join(root, file)
            # Calculate relative path for S3 key
            # If local is C:\...\Starsector\core\foo.jar and root_prefix is Starsector
            # We want key to be Starsector/core/foo.jar
            
            rel_path = os.path.relpath(full_path, local_path)
            # Fix path separators for S3 (forward slashes)
            rel_path = rel_path.replace("\\", "/")
            
            s3_key = f"{root_prefix}/{rel_path}"
            files_to_upload.append((full_path, s3_key))

    print(f"Found {len(files_to_upload)} files to upload in {root_prefix}...")

    success_count = 0
    error_count = 0
    
    # Simple sequential upload for reliability logs, but could be threaded
    for i, (full_path, s3_key) in enumerate(files_to_upload):
        try:
            content_type, _ = mimetypes.guess_type(full_path)
            if not content_type:
                content_type = "application/octet-stream"
            
            # Print progress every 10 files or for large files
            file_size = os.path.getsize(full_path)
            size_mb = file_size / (1024 * 1024)
            
            if i % 50 == 0 or size_mb > 10:
                print(f"[{i+1}/{len(files_to_upload)}] Uploading: {s3_key} ({size_mb:.2f} MB)")

            extra_args = {'ContentType': content_type}
            
            s3_client.upload_file(
                Filename=full_path,
                Bucket=bucket_name,
                Key=s3_key,
                ExtraArgs=extra_args
            )
            success_count += 1
        except Exception as e:
            print(f"FAILED to upload {s3_key}: {e}")
            error_count += 1

    print(f"Finished {root_prefix}. Success: {success_count}, Errors: {error_count}")

def check_bucket(s3_client):
    try:
        s3_client.head_bucket(Bucket=BUCKET_NAME)
        print(f"Verified Access to Bucket: {BUCKET_NAME}")
        return True
    except Exception as e:
        print(f"Error accessing bucket {BUCKET_NAME}: {e}")
        return False

def main():
    print("Initializing R2 Client...")
    try:
        s3 = boto3.client(
            service_name='s3',
            endpoint_url=ENDPOINT_URL,
            aws_access_key_id=ACCESS_KEY_ID,
            aws_secret_access_key=SECRET_ACCESS_KEY,
            region_name='auto'  # R2 requires region but 'auto' is usually fine or 'us-east-1'
        )
    except Exception as e:
        print(f"Failed to create client: {e}")
        sys.exit(1)

    if not check_bucket(s3):
        print("Cannot access bucket. Check credentials/name.")
        sys.exit(1)

    # Calculate absolute paths
    base_dir = os.getcwd()
    
    for dir_name, upload_prefix in DIRS_TO_UPLOAD.items():
        abs_path = os.path.join(base_dir, dir_name)
        upload_directory(abs_path, BUCKET_NAME, s3, upload_prefix)

    print("\nALL UPLOADS COMPLETE.")

if __name__ == "__main__":
    main()
