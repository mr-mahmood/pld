"use client";

import React, { useState, useRef, useEffect } from 'react';
import localFont from 'next/font/local';

const myCustomFont = localFont({
    src: '../../../public/fonts/stitrbd.ttf',
    display: 'swap',
});

// Farsi character → index map
const value_to_idx = {
    "0": 0, "1": 1, "2": 2, "3": 3, "4": 4,
    "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
    "ا": 10, "ب": 11, "ت": 12, "ث": 13, "ج": 14,
    "د": 15, "ز": 16, "س": 17, "ش": 18, "ص": 19,
    "ط": 20, "ع": 21, "ق": 22, "ل": 23,
    "م": 24, "ن": 25, "ه": 26, "و": 27, "پ": 28,
    "ژ": 29, "ی": 30
};

// Reverse mapping for converting index back to character
const idx_to_value = Object.fromEntries(
    Object.entries(value_to_idx).map(([k, v]) => [v, k])
);

// Indices where digits should be white
const whiteDigitIndices = [10, 13, 16, 28];

function ImageWithInputs({ onPlateChange, initialPlate = '' }) {
    const [plateImage, setPlateImage] = useState("/images/plate/base_plate.png");
    const [digitColors, setDigitColors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [isInitialized, setIsInitialized] = useState(false);

    const [inputs, setInputs] = useState({
        input1: '', input2: '', input3: '', input4: '',
        input5: '', input6: '', input7: '', input8: ''
    });

    const inputRefs = useRef([]);

    // Initialize with initialPlate data
    useEffect(() => {
        if (initialPlate && initialPlate !== '' && !isInitialized) {
            const plateArray = initialPlate.split('-');
            if (plateArray.length === 8) {
                // Convert index back to character for input3
                const charIndex = parseInt(plateArray[2]);
                const charValue = idx_to_value[charIndex] || '';
                
                const newInputs = {
                    input1: plateArray[0] || '',
                    input2: plateArray[1] || '',
                    input3: charValue,
                    input4: plateArray[3] || '',
                    input5: plateArray[4] || '',
                    input6: plateArray[5] || '',
                    input7: plateArray[6] || '',
                    input8: plateArray[7] || '',
                };
                
                setInputs(newInputs);
                setIsInitialized(true);

                // Update plate image based on character
                if (charValue && value_to_idx[charValue]) {
                    const idx = value_to_idx[charValue];
                    setPlateImage(`/images/plate/plate_${idx}.png`);
                    
                    // Update digit colors based on the character index
                    const newDigitColors = { ...digitColors };
                    inputConfigs.forEach(config => {
                        if (config.type === 'number') {
                            newDigitColors[config.id] = whiteDigitIndices.includes(idx) ? 'white' : 'black';
                        }
                    });
                    setDigitColors(newDigitColors);
                }
            }
        }
    }, [initialPlate, isInitialized]);

    // Reset initialized flag when modal closes or initialPlate changes to empty
    useEffect(() => {
        if (!initialPlate || initialPlate === '') {
            setIsInitialized(false);
            setInputs({
                input1: '', input2: '', input3: '', input4: '',
                input5: '', input6: '', input7: '', input8: ''
            });
            setPlateImage("/images/plate/base_plate.png");
            setDigitColors({});
            setErrorMessage('');
        }
    }, [initialPlate]);

    useEffect(() => {
        inputRefs.current = inputRefs.current.slice(0, 8);
        setIsInput3EffectivelyHidden(inputs.input3.length > 0);
    }, []);

    const [isInput3EffectivelyHidden, setIsInput3EffectivelyHidden] = useState(inputs.input3.length > 0);

    const handleInputChange = (id, value, index, type) => {
        let processedValue = value;
        let updatedPlateImage = plateImage;
        let currentDigitColors = { ...digitColors };

        if (type === 'number') {
            processedValue = value.replace(/[^0-9]/g, '');

            // Prevent '0' in input1, input4, and input7
            const noZeroInputs = ['input1', 'input4', 'input7'];
            if (noZeroInputs.includes(id) && processedValue === '0') {
                setErrorMessage(`ورود عدد 0 در این قسمت مجاز نیست`);
                setTimeout(() => setErrorMessage(''), 5000);
                return;
            } else {
                setErrorMessage('');
            }

            const match = plateImage.match(/plate_(\d+)\.png/);
            const currentPlateIndex = match ? parseInt(match[1], 10) : -1;

            if (currentPlateIndex !== -1) {
                currentDigitColors[id] = whiteDigitIndices.includes(currentPlateIndex) ? 'white' : 'black';
            } else {
                currentDigitColors[id] = 'black';
            }
        } else if (type === 'char') {
            if (value.length > 0) {
                const char = value[value.length - 1];
                let normalizedChar = char.replace(/آ/g, 'ا');
                normalizedChar = normalizedChar.replace(/[^\u0600-\u06FF]/g, '');

                // Check if the normalized character is in our map
                if (normalizedChar in value_to_idx) {
                    processedValue = normalizedChar;
                    const idx = value_to_idx[normalizedChar];
                    updatedPlateImage = `/images/plate/plate_${idx}.png`;

                    // Clear any previous character error
                    setErrorMessage('');

                    Object.keys(inputs).forEach((inputId) => {
                        const config = inputConfigs.find(cfg => cfg.id === inputId);
                        if (config && config.type === 'number') {
                            currentDigitColors[inputId] = whiteDigitIndices.includes(idx) ? 'white' : 'black';
                        }
                    });
                } else {
                    // Invalid character entered
                    const validChars = Object.keys(value_to_idx).filter(key => isNaN(Number(key)) && key !== '0' && key !== '1' && key !== '2' && key !== '3' && key !== '4' && key !== '5' && key !== '6' && key !== '7' && key !== '8' && key !== '9').join('، ');
                    setErrorMessage(`حروف مجاز: ${validChars}`);
                    setTimeout(() => setErrorMessage(''), 3000);

                    processedValue = inputs[id]; // Keep the previous valid value
                    updatedPlateImage = plateImage;
                    currentDigitColors = digitColors;
                    return; // Exit early to prevent invalid character
                }
            } else {
                processedValue = '';
                updatedPlateImage = "/images/plate/base_plate.png";
                setErrorMessage('');
                Object.keys(inputs).forEach(inputId => {
                    const config = inputConfigs.find(cfg => cfg.id === inputId);
                    if (config && config.type === 'number') {
                        currentDigitColors[inputId] = 'black';
                    }
                });
            }
        }

        const updatedInputs = { ...inputs, [id]: processedValue };
        setInputs(updatedInputs);
        setPlateImage(updatedPlateImage);
        setDigitColors(currentDigitColors);
        setIsInput3EffectivelyHidden(updatedInputs.input3.length > 0);

        if (onPlateChange) {
            const plateNumberArray = inputConfigs.map(config => {
                const inputValue = updatedInputs[config.id] || '';

                if (config.id === 'input3' && inputValue) {
                    const idx = value_to_idx[inputValue];
                    return idx.toString();
                }
                return inputValue;
            });
            onPlateChange(plateNumberArray.join('-'));
        }

        if (processedValue.length === 1 && inputs[id].length === 0 && index < 7) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e, id, index) => {
        if (e.key === 'Backspace' || e.key === 'Delete') {
            const valueBeforeDelete = inputs[id];

            if (valueBeforeDelete) {
                const updatedInputs = { ...inputs, [id]: '' };
                setInputs(updatedInputs);

                if (id === "input3") {
                    setPlateImage("/images/plate/base_plate.png");
                    const newDigitColors = { ...digitColors };
                    Object.keys(inputs).forEach((inputId) => {
                        const config = inputConfigs.find(cfg => cfg.id === inputId);
                        if (config && config.type === 'number') {
                            newDigitColors[inputId] = 'black';
                        }
                    });
                    setDigitColors(newDigitColors);
                    setIsInput3EffectivelyHidden(false);
                    setErrorMessage(''); // Clear error when clearing input3
                } else if (inputConfigs[index].type === 'number') {
                    const newDigitColors = { ...digitColors };
                    newDigitColors[id] = 'black';
                    setDigitColors(newDigitColors);
                }

                if (onPlateChange) {
                    const plateStringArray = inputConfigs.map((config, i) => {
                        let value = '';
                        if (i === index) {
                            value = '';
                        } else {
                            value = updatedInputs[config.id] || '';
                        }

                        if (config.id === 'input3' && value) {
                            const idx = value_to_idx[value];
                            return idx.toString();
                        }
                        return value;
                    });
                    onPlateChange(plateStringArray.join('-'));
                }
            }

            if (!inputs[id] && index > 0) {
                inputRefs.current[index - 1]?.focus();
            }
        }

        if (['ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
            e.preventDefault();
            if (e.key === 'ArrowLeft' && index > 0) {
                inputRefs.current[index - 1]?.focus();
            } else if (e.key === 'ArrowRight' && index < 7) {
                inputRefs.current[index + 1]?.focus();
            } else if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (index > 0) inputRefs.current[index - 1]?.focus();
                } else {
                    if (index < 7) inputRefs.current[index + 1]?.focus();
                }
            }
        }
    };

    const inputConfigs = [
        { id: 'input1', placeholder: '3', maxLength: 1, type: 'number', inputMode: 'numeric' },
        { id: 'input2', placeholder: '7', maxLength: 1, type: 'number', inputMode: 'numeric' },
        { id: 'input3', placeholder: 'ص', maxLength: 1, type: 'char' },
        { id: 'input4', placeholder: '4', maxLength: 1, type: 'number', inputMode: 'numeric' },
        { id: 'input5', placeholder: '7', maxLength: 1, type: 'number', inputMode: 'numeric' },
        { id: 'input6', placeholder: '5', maxLength: 1, type: 'number', inputMode: 'numeric' },
        { id: 'input7', placeholder: '3', maxLength: 1, type: 'number', inputMode: 'numeric' },
        { id: 'input8', placeholder: '3', maxLength: 1, type: 'number', inputMode: 'numeric' },
    ];

    const isWhiteDigitActive = (() => {
        const match = plateImage.match(/plate_(\d+)\.png/);
        if (match) {
            const index = parseInt(match[1], 10);
            return whiteDigitIndices.includes(index);
        }
        return false;
    })();

    return (
        <div className="plateImageContainer" style={{ position: 'relative' }}>
            <img
                src={plateImage}
                alt="License Plate Background"
                className="plateImage"
            />

            {errorMessage && (
                <div style={{
                    position: 'absolute',
                    left: '0',
                    right: '0',
                    textAlign: 'center',
                    color: 'red',
                    fontSize: '16px',
                    zIndex: 10,
                    paddingTop: '8px',
                }}>
                    {errorMessage}
                </div>
            )}

            {inputConfigs.map((inputInfo, index) => {
                const input3HideClass = inputInfo.id === 'input3' && inputs.input3.length > 0 ? 'input3-hidden' : '';
                const digitColorClass = isWhiteDigitActive && inputInfo.type === 'number' ? 'white-digits' : '';
                return (
                    <input
                        key={inputInfo.id}
                        id={inputInfo.id}
                        type="text"
                        value={inputs[inputInfo.id]}
                        onChange={(e) => handleInputChange(inputInfo.id, e.target.value, index, inputInfo.type)}
                        onKeyDown={(e) => handleKeyDown(e, inputInfo.id, index)}
                        className={`baseInputStyle ${inputInfo.id} ${input3HideClass} ${digitColorClass}`}
                        style={{ fontFamily: myCustomFont.style.fontFamily }}
                        placeholder={inputInfo.placeholder}
                        maxLength={inputInfo.maxLength}
                        ref={el => inputRefs.current[index] = el}
                        inputMode={inputInfo.inputMode}
                    />
                );
            })}
        </div>
    );
}

export default ImageWithInputs;