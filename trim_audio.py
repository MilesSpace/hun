import librosa
import soundfile as sf
import os
import numpy as np

def trim_audio_to_duration(input_file, output_file, target_duration=3.0):
    """
    将音频文件剪辑到指定时长
    
    Args:
        input_file: 输入音频文件路径
        output_file: 输出音频文件路径
        target_duration: 目标时长（秒）
    """
    try:
        # 加载音频文件
        print(f"正在加载音频文件: {input_file}")
        audio, sr = librosa.load(input_file, sr=None)
        
        # 计算目标采样点数
        target_samples = int(target_duration * sr)
        
        # 如果音频长度超过目标长度，截取前target_duration秒
        if len(audio) > target_samples:
            print(f"音频长度: {len(audio)/sr:.2f}秒，截取前{target_duration}秒")
            audio = audio[:target_samples]
        else:
            print(f"音频长度: {len(audio)/sr:.2f}秒，小于目标长度{target_duration}秒")
            # 如果音频长度不足，可以选择重复或静音填充
            # 这里选择静音填充
            padding_length = target_samples - len(audio)
            audio = np.concatenate([audio, np.zeros(padding_length)])
        
        # 保存剪辑后的音频
        sf.write(output_file, audio, sr)
        print(f"音频已保存到: {output_file}")
        print(f"最终时长: {len(audio)/sr:.2f}秒")
        # xiugai2
    except Exception as e:
        print(f"处理音频时出错: {e}")

if __name__ == "__main__":
    # 剪辑shoot_shotgun.wav为1秒
    input_file1 = "assets/shoot_shotgun.wav"
    output_file1 = "assets/shoot_shotgun_1s.wav"
    if os.path.exists(input_file1):
        trim_audio_to_duration(input_file1, output_file1, 1.0)
        print("shoot_shotgun_1s.wav 剪辑完成！")
    else:
        print(f"错误: 找不到文件 {input_file1}")
    # 剪辑shoot_normal.wav为1秒
    input_file2 = "assets/shoot_normal.wav"
    output_file2 = "assets/shoot_normal_1s.wav"
    if os.path.exists(input_file2):
        trim_audio_to_duration(input_file2, output_file2, 1.0)
        print("shoot_normal_1s.wav 剪辑完成！")
    else:
        print(f"错误: 找不到文件 {input_file2}") 