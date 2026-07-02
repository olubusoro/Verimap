from fastapi import FastAPI, UploadFile, File
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D
from tensorflow.keras.models import Model
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
import numpy as np
from PIL import Image
import io

app = FastAPI()

print("1. Booting AI Model Blueprint...")
# Rebuild the exact same structure we used in Google Colab
base_model = MobileNetV2(weights=None, include_top=False, input_shape=(224, 224, 3))
x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dense(128, activation='relu')(x)

# CHANGE THIS TO 2 IF YOU ONLY USED TWO DISASTER FOLDERS
predictions = Dense(2, activation='softmax')(x) 
model = Model(inputs=base_model.input, outputs=predictions)

print("2. Injecting Trained Weights...")
# Load JUST the math, ignoring the broken Keras configurations completely
model.load_weights("verimap_model.keras")
print("SUCCESS: Brain successfully loaded!")

# CHANGE THESE IF YOU ONLY USED TWO FOLDERS
CLASS_NAMES = ["collapsed_building", "flood", "normal"] 

@app.post("/analyze")
async def verify(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        img = Image.open(io.BytesIO(contents)).convert('RGB')
        img = img.resize((224, 224))
        
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = preprocess_input(img_array)
        
        predictions = model.predict(img_array)[0]
        max_index = np.argmax(predictions)
        confidence = float(predictions[max_index])
        predicted_class = CLASS_NAMES[max_index]
        
        return {
            "top_label": predicted_class,
            "cnn_score": confidence
        }
    except Exception as e:
        return {"error": str(e)}