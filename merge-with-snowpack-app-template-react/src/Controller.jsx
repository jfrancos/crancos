import React, { useState, useEffect, useRef } from 'react';
import { useCollection } from './Database';
import { HiPlus, HiX, HiPencil, HiCheck } from 'react-icons/hi';
import { useKey, useOutsideClickRef } from 'rooks'; // react-recipes looks great too

const Controller = () => {
  const [editing, setEditing] = useState(null);
  const [collection, tasks] = useCollection('documents');
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    collection.insert({
      stringData: inputValue,
      booleanData: false,
      numberData: 0,
    });
    setInputValue('');
  };

  useKey('Enter', () => {
    if (editing !== null) {
      setEditing(null);
    } else if (inputValue !== '') {
      handleAdd();
    }
  });

  const handleInput = ({ target: { value } }) => {
    setInputValue(value);
  };

  const handleRemoveChecked = () => {
    collection.bulkRemove(checked.map((task) => task.id));
  };

  // goal: make it easy to create arbitrary indices in-browser
  // to avoid sorting like this:
  const checked = tasks.filter((task) => task.booleanData === true);
  const percentChecked = checked.length / tasks.length;
  const transform = `scaleX(${percentChecked})`;

  console.log('new');

  return (
    <div className="h-full w-full justify-center items-center  bg-blue-300">
      <div className="bg-gray-300 sm:h-2/3 sm:w-2/3 md:h-1/2 md:w-1/2 h-full w-full max-w-2xl rounded-md flex-col py-6 gap-y-4">
        {/* Main box */}
        <div
          className="self-center font-bold text-3xl .leading-none"
          style={{ lineHeight: 0.75 }}
        >
          {/* Row: title */}
          TODOLIST
        </div>
        <div className="mx-8 gap-x-4 h-8">
          {/* Row: Text input, Add button */}
          <input
            className="flex-grow p-4"
            value={inputValue}
            onChange={handleInput}
            title="Task to add"
          />
          <div className="w-8 justify-center items-center bg-blue-300">
            <HiPlus className="h-6 w-6" onClick={handleAdd} />
          </div>
        </div>
        <div className="flex-col overflow-auto flex-1">
          {/* Row: Tasks */}
          {tasks.map(({ atomicPatch, remove, id, booleanData, stringData }) => (
            <Task
              completed={booleanData}
              title={stringData}
              editing={editing}
              setEditing={setEditing}
              key={id}
              atomicPatch={atomicPatch}
              remove={remove}
              id={id}
            />
          ))}
        </div>
        <div className="h-8 mx-8 justify-between">
          {/* Row: Status, Clear checked */}
          <div className="rounded-md overflow-hidden grid w-1/3 bg-gray-100">
            <div
              className="grid-overlay bg-yellow-400 transition-transform transform-gpu"
              // style={{ width: percentChecked }}
              style={{ transform, transformOrigin: 'left' }}
            />

            <div className="font-semibold grid-overlay justify-center items-center transform-gpu">
              {`${checked.length} out of ${tasks.length} done`}
            </div>
          </div>
          <div
            className="w-1/3 bg-blue-300 hover:bg-blue-500 justify-around items-center font-semibold rounded-lg"
            onClick={handleRemoveChecked}
          >
            Remove checked <HiX className="w-5 h-5"></HiX>
          </div>
        </div>
      </div>
    </div>
  );
};

const Task = ({
  editing,
  atomicPatch,
  remove,
  title,
  completed,
  setEditing,
  id,
}) => {
  const [ref] = useOutsideClickRef(() => {
    if (editing === id) {
      setEditing(null);
    }
  });

  const handleCheck = () => {
    atomicPatch({ booleanData: !completed });
  };

  const handleRemove = () => {
    remove();
  };

  const handleStartEdit = () => {
    setEditing(id);
  };

  const handleInput = async ({ target: { value } }) => {
    await atomicPatch({ stringData: value });
  };

  return (
    <div ref={ref} className="px-8 py-1 items-center odd:bg-gray-200 gap-x-2">
      <div
        className="bg-gray-100 h-5 w-5 rounded-sm justify-center items-center"
        onClick={handleCheck}
      >
        {completed && <HiCheck className="h-5 w-5" />}
      </div>
      <div className="flex-1 block truncate">
        {editing === id ? (
          <input className="w-full" value={title} onChange={handleInput} />
        ) : (
          title
        )}
      </div>
      <HiPencil className="h-5 w-5" onClick={handleStartEdit} />
      <HiX className="h-5 w-5" onClick={handleRemove} />
    </div>
  );
};

export default Controller;
