import os
import shutil
from datetime import datetime

def move_images_recursive(source_dir, destination_dir, specified_time):
    specified_time = datetime.strptime(specified_time, "%Y-%m-%d %H:%M:%S")

    if not os.path.exists(destination_dir):
        os.makedirs(destination_dir)

    for root, dirs, files in os.walk(source_dir):
        for filename in files:
            if not filename.startswith('.'):  # 跳过以点开头的文件
                filepath = os.path.join(root, filename)

                if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                    create_time = datetime.fromtimestamp(os.path.getctime(filepath))

                    if create_time > specified_time:
                        destination_path = os.path.join(destination_dir, filename)
                        shutil.move(filepath, destination_path)
                        print(f"Moved {filename} to {destination_dir}")

if __name__ == "__main__":
    source_directory = "/path/to/your/photos"
    destination_directory = "/new/path/to/your/photos"
    specified_time_string = "2024-02-21 13:20:00"  # 指定的时间字符串，格式为"%Y-%m-%d %H:%M:%S"

    move_images_recursive(source_directory, destination_directory, specified_time_string)
