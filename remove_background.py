#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
图片背景去除工具
使用 rembg 库去除图片背景，保留人物
"""

import os
from rembg import remove
from PIL import Image
import sys

def remove_background(input_path, output_path=None):
    """
    去除图片背景
    
    Args:
        input_path (str): 输入图片路径
        output_path (str): 输出图片路径，如果为None则自动生成
    """
    try:
        # 检查输入文件是否存在
        if not os.path.exists(input_path):
            print(f"错误：输入文件 {input_path} 不存在")
            return False
        
        # 如果没有指定输出路径，自动生成
        if output_path is None:
            base_name = os.path.splitext(input_path)[0]
            output_path = f"{base_name}_no_bg.png"
        
        print(f"正在处理图片: {input_path}")
        print("请稍等，这可能需要几秒钟...")
        
        # 读取输入图片
        input_image = Image.open(input_path)
        
        # 去除背景
        output_image = remove(input_image)
        
        # 保存结果
        output_image.save(output_path)
        
        print(f"背景去除完成！")
        print(f"输出文件: {output_path}")
        
        return True
        
    except Exception as e:
        print(f"处理过程中出现错误: {str(e)}")
        return False

def main():
    """主函数"""
    input_file = "assets/boss.png"
    
    print("=== 图片背景去除工具 ===")
    print(f"输入文件: {input_file}")
    
    # 执行背景去除
    success = remove_background(input_file)
    
    if success:
        print("\n✅ 抠图完成！人物已成功提取，背景已去除。")
        print("输出文件保存为: assets/boss.png")
    else:
        print("\n❌ 抠图失败，请检查错误信息。")

if __name__ == "__main__":
    main() 