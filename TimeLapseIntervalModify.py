import os
import shutil

def rename_files_with_continuous_numbers(folder_path):
    # 获取目录下所有文件
    files = os.listdir(folder_path)
    
    # 排序文件列表
    files.sort()
    
    # 获取文件数量的位数，用于确定编号的格式
    num_digits = len(str(len(files)))
    
    # 重命名文件
    for index, file_name in enumerate(files):
        # 构造新文件名
        new_name = "LZR" + f"{index + 1:0{num_digits}d}_{file_name}"
        
        # 构造文件的完整路径
        old_path = os.path.join(folder_path, file_name)
        new_path = os.path.join(folder_path, new_name)
        
        # 重命名文件
        os.rename(old_path, new_path)
        print(f"重命名文件: {file_name} -> {new_name}")

def copy_arw_files(source_folder, destination_folder, interval=6):
    # 创建目标文件夹
    if not os.path.exists(destination_folder):
        os.makedirs(destination_folder)

    arw_files = sorted([f for f in os.listdir(source_folder) if f.endswith('.ARW')])
    
    for i in range(0, len(arw_files), interval):
        arw_file_to_copy = arw_files[i]
        source_path = os.path.join(source_folder, arw_file_to_copy)
        destination_path = os.path.join(destination_folder, arw_file_to_copy)
        
        # 复制文件
        shutil.copy2(source_path, destination_path)
        print(f"复制文件: {arw_file_to_copy}")

if __name__ == "__main__":
    # 指定源文件夹和目标文件夹
    source_folder = "/Volumes/SSD/TimeLapse"
    destination_folder = "/Volumes/SSD/TimeLapse4"

    # 指定每隔多少个.arw文件复制一次
    interval = 4

    # 执行复制操作
    copy_arw_files(source_folder, destination_folder, interval)

    rename_files_with_continuous_numbers(source_folder)

