import os
import re
import shutil

def replace_group_name(directory_path, new_group_name):
    # 获取目录中的文件
    files = [f for f in os.listdir(directory_path) if os.path.isfile(os.path.join(directory_path, f))]
    # 修改正则表达式，匹配 <crs:Group> 中的内容
    pattern = re.compile(r'<crs:Group>\s*<rdf:Alt>\s*<rdf:li xml:lang="x-default">.*?</rdf:li>\s*</rdf:Alt>\s*</crs:Group>', re.DOTALL)

    for file_name in files:
        file_path = os.path.join(directory_path, file_name)

        try:
            # 尝试使用utf-8编码打开文件
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()

        except UnicodeDecodeError:
            # 如果出现解码错误，尝试使用其他编码，或者忽略错误
            with open(file_path, 'r', encoding='ISO-8859-1') as file:
                content = file.read()

        # 进行替换操作，确保组名被正确替换
        modified_content = re.sub(pattern, f'<crs:Group>\n  <rdf:Alt>\n   <rdf:li xml:lang="x-default">{new_group_name}</rdf:li>\n  </rdf:Alt>\n</crs:Group>', content)

        # 写入修改后的内容到文件
        with open(file_path, 'w', encoding='utf-8') as file:
            file.write(modified_content)

    print(f'替换完成，新的组名为: {new_group_name}')


def remove_from_filename(file_path, remove_text):
    try:
        directory, filename = os.path.split(file_path)
        new_filename = filename.replace('remove_text', '.')
        new_path = os.path.join(directory, new_filename)

        # 如果文件名有变化，则重命名文件
        if file_path != new_path:
            os.rename(file_path, new_path)
            print(f'Successfully removed ${remove_text} from filename: {file_path} -> {new_path}')
    except Exception as e:
        print(f'Error processing {file_path}: {e}')

def process_filename_remove(directory_path, remove_text):
    try:
        for root, dirs, files in os.walk(directory_path):
            for file in files:
                file_path = os.path.join(root, file)
                remove_from_filename(file_path, remove_text)
    except Exception as e:
        print(f'Error processing directory {directory_path}: {e}')

def replace_text_in_file(file_path, old_texts, new_text):
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()

        for old_text in old_texts:
            content = content.replace(old_text, new_text)

        with open(file_path, 'w', encoding='utf-8') as file:
            file.write(content)

        print(f'Successfully replaced {old_texts} with "{new_text}" in {file_path}')
    except Exception as e:
        print(f'Error processing {file_path}: {e}')


def full_text_replace(directory_path, old_text, new_text):
    try:
        for root, dirs, files in os.walk(directory_path):
            for file in files:
                file_path = os.path.join(root, file)
                replace_text_in_file(file_path, old_text, new_text)
    except Exception as e:
        print(f'Error processing directory {directory_path}: {e}')


def copy_xmp_files(src_directory, dest_directory):
    try:
        # 创建目标目录
        os.makedirs(dest_directory, exist_ok=True)

        # 遍历源目录中的所有文件和子目录
        for root, dirs, files in os.walk(src_directory):
            for file in files:
                if file.lower().endswith('.xmp'):
                    # 构造源文件和目标文件的完整路径
                    src_file_path = os.path.join(root, file)
                    dest_file_path = os.path.join(dest_directory, file)

                    # 拷贝文件
                    shutil.copy2(src_file_path, dest_file_path)
                    print(f'Successfully copied {file} to {dest_directory}')

        print('Copying XMP files completed.')
    except Exception as e:
        print(f'Error during file copy: {e}')


def get_group_names(directory_path):
    found_data = set()  # 用于保存匹配到的数据，使用 set 进行去重

    try:
        for root, dirs, files in os.walk(directory_path):
            for file_name in files:
                file_path = os.path.join(root, file_name)
                with open(file_path, 'r', encoding='utf-8') as file:
                    content = file.read()

                    # 使用正则表达式匹配目标格式的文本
                    pattern = re.compile(r'<crs:Group>\s*<rdf:Alt>\s*<rdf:li xml:lang="x-default">([^<]+)</rdf:li>\s*</rdf:Alt>\s*</crs:Group>')
                    matches = pattern.findall(content)

                    # 将匹配到的数据添加到集合中
                    found_data.update(matches)

    except Exception as e:
        print(f'Error processing directory {directory_path}: {e}')

    print(found_data)


# 使用示例



# 复制多级目录下所有XMP文件到指定目录,若目录不存在将自动创建
# new_path = "/Users/zhangzhibo/settings_new" 
# copy_xmp_files(directory_path, new_path)

# # 获取指定目录下的全部xmp预设文件的组名
# get_group_names(new_path)

# 替换目录下全部xmp预设组名为指定名称(仅适用于已经包含组名的xmp预设文件)
# new_group_name = '文艺胶片'
# replace_group_name(directory_path, new_group_name)

# 将目录路径替换为你的目录路径
directory_path = "/Users/zhangzhibo/settings_new"

# 移除指定目录下的全部文件的[文件名]中的指定文本
process_filename_remove(directory_path,"[一麻印象]")

# [慎用] 替换指定目录下的全部文件的指定文本
old_text = ['浪漫甜美粉色[一麻印象]', '宠物调色预设', '浪漫樱花预设[一麻印象]', '情绪黑白暗调[一麻印象]', '冬季圣诞棕色[一麻印象]', '圣诞暖色风格[一麻印象]']
new_text = "我的预设参考"
full_text_replace(directory_path, old_text, new_text)

old_text = ['[一麻印象]','【一麻印象】','【】']
new_text = ""
full_text_replace(directory_path, old_text, new_text)
