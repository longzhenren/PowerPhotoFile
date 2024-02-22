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


# import os
# import shutil

# def move_and_delete_files_recursively(src_dir, dest_dir, file_name):
#     # 确保源目录存在
#     if not os.path.exists(src_dir):
#         print(f"源目录 '{src_dir}' 不存在.")
#         return

#     # 确保目标目录存在，如果不存在则创建
#     if not os.path.exists(dest_dir):
#         os.makedirs(dest_dir)

#     # 递归遍历源目录及其子目录
#     for root, dirs, files in os.walk(src_dir):
#         for file in files:
#             if file == file_name:
#                 src_path = os.path.join(root, file)
#                 dest_path = os.path.join(dest_dir, file)

#                 # 移动文件
#                 shutil.move(src_path, dest_path)

#                 print(f"移动文件: {file} 到 {dest_dir}")

#     print(f"已完成递归移动删除操作。") 

# # 使用示例
source_directory = "/path/to/your/photos"
destination_directory = "/new/path/to/your/photos"
file_to_move_and_delete = "file.name"

# move_and_delete_files_recursively(source_directory, destination_directory, file_to_move_and_delete)
