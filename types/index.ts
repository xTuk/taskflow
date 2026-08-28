export interface TaskDTO {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  order: number;
  columnId: string;
  attachmentKey: string | null;
  attachmentName: string | null;
  attachmentUrl: string | null;
  attachmentType: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ColumnDTO {
  id: string;
  name: string;
  order: number;
  boardId: string;
  tasks: TaskDTO[];
}

export interface BoardDTO {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  columns: ColumnDTO[];
  _count?: {
    columns: number;
  };
}

export interface BoardSummaryDTO {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
}

export interface UserDTO {
  id: string;
  email: string;
  name: string;
}

export interface ApiError {
  error: string;
  details?: Record<string, string[] | undefined>;
}
