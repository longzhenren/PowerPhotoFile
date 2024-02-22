import os
import shutil

path1 = "/Users/zhangzhibo/Desktop/20231122/1" #已经修好的图
path2 = "/Volumes/Untitled/DCIM/10431122" #原图目录
path3 = "/Users/zhangzhibo/Desktop/20231122/raw" #目标目录
slist = os.listdir(path1)
flist = os.listdir(path2)
for i in slist:
    for j in flist:
        if os.path.splitext(i)[0] == os.path.splitext(j)[0] and os.path.splitext(j)[1] in ['.JPG']:
            shutil.copy2(os.path.join(path2, j), os.path.join(path3, j))
