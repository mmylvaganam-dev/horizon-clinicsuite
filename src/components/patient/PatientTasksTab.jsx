import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function PatientTasksTab({ patientId }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    task_type: 'follow_up',
    title: '',
    description: '',
    due_date: '',
    priority: 'medium'
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['patientTasks', patientId],
    queryFn: () => base44.entities.PatientTask.filter({ patient_id: patientId }),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.PatientTask.create({
      ...data,
      patient_id: patientId,
      assigned_to: user.id,
      assigned_to_email: user.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientTasks', patientId] });
      setDialogOpen(false);
      setFormData({ task_type: 'follow_up', title: '', description: '', due_date: '', priority: 'medium' });
      toast.success('Task created');
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: (taskId) => base44.entities.PatientTask.update(taskId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by: user.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientTasks', patientId] });
      toast.success('Task completed');
    },
  });

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Patient Tasks</h3>
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      {pendingTasks.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">No pending tasks</p>
      ) : (
        <div className="space-y-2">
          {pendingTasks.map((task) => (
            <div key={task.id} className="p-3 rounded-lg border bg-white flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium">{task.title}</h4>
                  <Badge className={
                    task.priority === 'urgent' ? 'bg-rose-100 text-rose-700' :
                    task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }>
                    {task.priority}
                  </Badge>
                </div>
                {task.description && <p className="text-sm text-slate-600">{task.description}</p>}
                {task.due_date && (
                  <p className="text-xs text-slate-500 mt-1">Due: {format(new Date(task.due_date), 'MMM d, yyyy')}</p>
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={() => completeTaskMutation.mutate(task.id)}>
                <CheckCircle className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Task Type</Label>
              <Select value={formData.task_type} onValueChange={(value) => setFormData({...formData, task_type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                  <SelectItem value="lab_review">Lab Review</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="medication_refill">Medication Refill</SelectItem>
                  <SelectItem value="preventive_care">Preventive Care</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Task title"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                />
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createTaskMutation.mutate(formData)}
                disabled={!formData.title || createTaskMutation.isPending}
              >
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}