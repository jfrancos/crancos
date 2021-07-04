import React, { useState, useEffect, useRef } from 'react';
import { FaReact } from 'react-icons/fa';
import {
    CreateDoc,
    DocsByUser,
    DeleteDoc,
    UpdateDoc,
  } from './Client';
import { useQuery, useMutation } from 'urql';

const Controller = () => {
    const [message, setMessage] = useState('Loading...');
    const [{ data, fetching, error }] = useQuery({ query: DocsByUser });
    const [createDocResult, createDoc] = useMutation(CreateDoc);
    const [deleteDocResult, deleteDoc] = useMutation(DeleteDoc);
    const [updateDocResult, updateDoc] = useMutation(UpdateDoc);
    
    useEffect(async () => {
      try {
        const response = await fetch('/api/message', { method: 'post' });
        const { message } = await response.json();
        setMessage(message);
      } catch {
        setMessage('api inaccessible, try `netlify dev`');
      }
    });
  
    return (
      <div className="h-full w-full justify-center items-center">
        <div className="grid">
          <FaReact className="grid-overlay h-96 w-96 text-purple-100" />
          <div className="grid-overlay justify-center items-center">
            {message}
          </div>
        </div>
      </div>
    );
  };
  

  export default Controller