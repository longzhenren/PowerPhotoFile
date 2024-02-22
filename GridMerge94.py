from PIL import Image,ImageFile
import os
from tqdm import tqdm
import shutil
import sys
import re
ImageFile.LOAD_TRUNCATED_IMAGES = True
Image.MAX_IMAGE_PIXELS = None

def get_image_ratio(image_path):
    try:
        with Image.open(image_path) as img:
            width, height = img.size
            ratio = width / height
            orientation = "horizontal" if width >= height else "vertical"
            return ratio, orientation, width, height
    except Exception as e:
        print(f"Error processing image {image_path}: {e}")
        return None, None, None, None

def resize_image(image_path, target_size):
    try:
        with Image.open(image_path) as img:
            resized_img = img.resize(target_size, Image.LANCZOS)
            return resized_img
    except Exception as e:
        print(f"Error resizing image {image_path}: {e}")
        return None

def group_images_by_ratio_and_size(directory):
    image_files = [f for f in os.listdir(directory) if not f.startswith('.') and f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp'))]
    image_files.sort()

    grouped_images = {"16:9": [], "4:3": [], "3:4": [], "9:16": [], "2:3": [], "3:2": [], "horizontal": [], "vertical": []}

    if not image_files:
        return grouped_images

    for image_file in image_files:
        image_path = os.path.join(directory, image_file)
        ratio, orientation, width, height = get_image_ratio(image_path)

        if ratio is not None and orientation is not None:
            if 1.7 < ratio < 1.81:
                target_size = (4800, 2700)
                whname = "16:9"
            elif 1.3 < ratio < 1.41:
                target_size = (4800, 3600)
                whname = "4:3"
            elif 0.7 < ratio < 0.81:
                target_size = (3600, 4800)
                whname = "3:4"
            elif 0.5 < ratio < 0.61:
                target_size = (2700, 4800)
                whname = "9:16"
            elif 0.65 < ratio < 0.67:  # Adjusted for 2:3 aspect ratio
                target_size = (3200, 4800)
                whname = "2:3"
            elif 1.48 < ratio < 1.52:  # Adjusted for 3:2 aspect ratio
                target_size = (4800, 3200)
                whname = "3:2"
            else:
                whname = orientation
                # 等比例缩放,保持高度为4800
                target_size = (int(4800 * (width/height)), 4800)
                # continue

            grouped_images[whname].append((image_path, target_size))

    return grouped_images

def create_collage(images, output_directory, base_name, layout):
    try:
        resized_images = [(resize_image(image_path, target_size), target_size) for image_path, target_size in images if resize_image(image_path, target_size) is not None]

        total_images = len(resized_images)
        # progress_bar = tqdm(total=total_images, desc=f"Creating {layout} collage")

        if layout == "3x3":
            width, height = resized_images[0][0].size
            total_width = 3 * width
            total_height = 3 * height
            collage = Image.new('RGB', (total_width, total_height))
            for i in range(3):
                for j in range(3):
                    index = i * 3 + j
                    if index < total_images:
                        collage.paste(resized_images[index][0], (j * width, i * height))
                        # progress_bar.update(1)
        elif layout == "2x2":
            width, height = resized_images[0][0].size
            total_width = 2 * width
            total_height = 2 * height
            collage = Image.new('RGB', (total_width, total_height))
            for i in range(2):
                for j in range(2):
                    index = i * 2 + j
                    if index < total_images:
                        collage.paste(resized_images[index][0], (j * width, i * height))
                        # progress_bar.update(1)
        elif layout == "1xM":
            total_width = sum(image[0].size[0] for image in resized_images)
            total_height = resized_images[0][0].size[1]
            collage = Image.new('RGB', (total_width, total_height))
            current_width = 0
            for image, filename in resized_images:
                collage.paste(image, (current_width, 0))
                current_width += image.width  # 更新当前宽度

        # progress_bar.close()

        # Ensure the output directory exists
        os.makedirs(output_directory, exist_ok=True)

        # Save the collage with a numbered filename
        safe_base_name = re.sub(r'[\/:*?"<>|]', '', base_name)
        output_path = os.path.join(output_directory, f'{safe_base_name}_{len(os.listdir(output_directory)) + 1}.jpg')
        collage.save(output_path)
    except Exception as e:
        print(f"Error creating collage: {e}")

def copy_images(images, output_directory, base_name):
    try:
        for i, (image_path, target_size) in enumerate(images):
            resized_img = resize_image(image_path, target_size)
            output_path = os.path.join(output_directory, f'{base_name}_{i + 1}.jpg')
            if resized_img is not None:
                resized_img.save(output_path)
    except Exception as e:
        print(f"Error copying images: {e}")

def process_directory(directory):
    grouped_images = group_images_by_ratio_and_size(directory)

    for orientation, images in grouped_images.items():
        if images == []:
            continue
        directory_progress_bar = tqdm(total=len(images), desc="Processing", position=0)
        orientation = orientation.replace(":", "x")
        directory_progress_bar.set_postfix({"CD": os.path.basename(directory), "OR": orientation})
        batches_3x3 = [images[i:i+9] for i in range(0, len(images) // 9 * 9, 9)]
        remaining_images = len(images) - len(batches_3x3) * 9
        batches_2x2 = [images[i:i+4] for i in range(len(batches_3x3) * 9, len(batches_3x3) * 9 + (remaining_images // 4) * 4, 4)]
        batch_1xM = images[len(batches_3x3) * 9 + len(batches_2x2) * 4:]
        for batch in batches_3x3:
            create_collage(batch, directory, f"{os.path.basename(directory)}_{orientation}", "3x3")
            directory_progress_bar.update(9)
        for batch in batches_2x2:
            create_collage(batch, directory, f"{os.path.basename(directory)}_{orientation}", "2x2")
            directory_progress_bar.update(4)
        if not len(batch_1xM)==0:
            create_collage(batch_1xM, directory, f"{os.path.basename(directory)}_{orientation}", "1xM")
            directory_progress_bar.update(len(batch_1xM))
        directory_progress_bar.close()

def main():
    if len(sys.argv) != 2:
        print("Usage: python script.py <root_directory>")
        sys.exit(1)

    root_directory = sys.argv[1]
    # root_directory = "/Volumes/SSD4T/套图搜集/爆机少女喵小吉"
    for current_directory, _, _ in os.walk(root_directory):
        process_directory(current_directory)

if __name__ == "__main__":
    main()

# if __name__ == "__main__":
#     root_directory = "/Volumes/SSD4T/套图搜集/桜井宁宁"
#     main(root_directory)
